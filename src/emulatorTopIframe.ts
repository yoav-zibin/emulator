namespace gamingPlatform {

export module emulatorTopIframe {
  export let iframeRows = 1;
  export let iframeCols = 1;

  // UI for local testing
  const playersInCommunity = 5;
  export let playModes = ["passAndPlay", "playAgainstTheComputer", "onlyAIs", 
    "pingPongMultiplayer", "speedMultiplayer", "community"];
  export let playMode = "passAndPlay";

  function isPassAndPlay() {
    return playMode == "passAndPlay";
  }
  function isPlayAgainstTheComputer() {
    return playMode == "playAgainstTheComputer";
  }
  function isOnlyAIs() {
    return playMode == "onlyAIs";
  }
  function isCommunity() {
    return playMode == "community";
  }
  function isMultiplayer() {
    return playMode == "speedMultiplayer" || playMode == "pingPongMultiplayer";
  }
  function isSpeedMultiplayer() {
    return playMode == "speedMultiplayer";
  }
  function isPingPongMultiplayer() {
    return playMode == "pingPongMultiplayer";
  }

  export let supportedLanguages: Language[] = 
      [{name:"English", code: "en"}, // English
      {name:"עברית", code: "iw"}, // Hebrew
      {name:"português", code: "pt"}, // Portuguese
      {name:"中文", code: "zh"}, // Chinese
      {name:"ελληνικά", code: "el"}, // Greek
      {name:"French", code: "fr"}, // French
      {name:"हिन्दी", code: "hi"}, // Hindi
      {name:"español", code: "es"}, // Spanish
      ];
  export let currentLanguage: Language = supportedLanguages[0];
  export let languageCode = "en";
  export let ogImageMaker = "https://dotted-guru-139914.appspot.com/";
  export let numberOfPlayersRequiredToMove = 3; // for community matches.
  export let numberOfPlayers = 2;
  let playersInfo: IPlayerInfo[];
  export let history: IMove[] = [];
  export let historyIndex = 0;
  let playerIdToProposal: IProposals = null;
  export let savedStates: SavedState[] = [];
  export let selectedSavedStateToLoad: SavedState = null;
  export let showEnterJson = false;
  export let pastedUpdateUiJson: string = '{"state": null, "turnIndex": 0, "endMatchScores": null}';

  let cacheIntegersTill: number[][] = [];
  export function getIntegersTill(number: any): number[] {
    if (cacheIntegersTill[number]) return cacheIntegersTill[number]; 
    let res: number[] = [];
    for (let i = 0; i < number; i++) {
      res.push(i);
    }
    cacheIntegersTill[number] = res;
    return res;
  }

  export function clearState() {
    let state:IMove = {
      turnIndex: 0,
      endMatchScores: null,
      state: null,
    };
    history = [state];
    historyIndex = 0;
    playerIdToProposal = {};
  }
  export function historyIndexChanged() {
    // angular makes historyIndex a string!
    historyIndex = Number(historyIndex);
    playerIdToProposal = {};
    resendUpdateUI();
  }
  export function startNewMatch() {
    clearState();
    resendUpdateUI();
  }

  function sendSetLanguage(id: number) {
    passMessage({setLanguage: {language: currentLanguage.code}}, id);
  }
  export function currentLanguageChanged() {
    for (let r = 0; r < iframeRows; r++) {
      for (let c = 0; c < iframeCols; c++) {
        let id = c + r*iframeCols;
        sendSetLanguage(id);
      }
    }
  }

  export function saveState() {
    let defaultStateName = "Saved state " + savedStates.length;
    var stateName = prompt("Please enter the state name", defaultStateName);
    if (!stateName) stateName = defaultStateName;
    savedStates.push({name: stateName, playerIdToProposal: playerIdToProposal, history: history});
    localStorage.setItem("savedStates", angular.toJson(savedStates, true));
  }
  export function loadMatchFromJson() {
    showEnterJson = false;
    let move: IMove = angular.fromJson(pastedUpdateUiJson);
    selectedSavedStateToLoad = {
      name: null, playerIdToProposal: null, history: [move]
    };
    loadMatch();
  }
  export function loadMatch() {
    if (!selectedSavedStateToLoad) return;
    history = angular.copy(selectedSavedStateToLoad.history);
    historyIndex = history.length - 1;
    playerIdToProposal = angular.copy(selectedSavedStateToLoad.playerIdToProposal);
    selectedSavedStateToLoad = null;
    resendUpdateUI();
  }
  function loadSavedStates() {
    let savedStatesJson = localStorage.getItem("savedStates");
    if (savedStatesJson) savedStates = angular.fromJson(savedStatesJson);
  }

  export function getOgImageState() {
    passMessage({getStateForOgImage: true}, 0);
  }

  export function resendUpdateUI() {
    // I want to avoid reloading the iframes (to be as close to the real platform as possible)
    for (let r = 0; r < iframeRows; r++) {
      for (let c = 0; c < iframeCols; c++) {
        let id = c + r*iframeCols;
        sendChangeUI(id);
      }
    }
  }
  export function resendUpdateUIRespectingPingPong() {
    if (!isPingPongMultiplayer() || historyIndex == 0) {
      resendUpdateUI();
      return;
    }
    // In ping pong, I want to be careful to only send updateUI to opponent if the turn changed.
    let currState = getState();
    let prevState = history[historyIndex - 1];
    if (prevState.turnIndex != currState.turnIndex) {
      resendUpdateUI();
      return;
    }
    sendChangeUI(currState.turnIndex);
  }
  

  export function reloadIframes() {
    console.info("reloadIframes: playMode=", playMode);
    setPlayersInfo();
    if (isCommunity()) {
      iframeRows = numberOfPlayers;
      iframeCols = playersInCommunity;
    } else if (isMultiplayer()) {
      iframeRows = 1;
      iframeCols = numberOfPlayers + 1; // if I want to support a viewer, then add +1.
    } else {
      iframeRows = 1;
      iframeCols = 1;
    }
    let message: MessageFromTopIframe = {
      toGameIframeId: null, toGameMessage: null, 
      rows: iframeRows, cols: iframeCols
    };
    passMessageToParent(message);
  }

  export function checkMove(move: IMove): void {
    if (!move) {
      throw new Error("Game called makeMove with a null move=" + move);
    }
    // Do some checks: turnIndexAfterMove is -1 iff endMatchScores is not null.
    let noTurnIndexAfterMove = move.turnIndex === -1;
    let hasEndMatchScores = !!move.endMatchScores;
    if (noTurnIndexAfterMove && !hasEndMatchScores) {
      throw new Error("Illegal move: turnIndexAfterMove was -1 but you forgot to set endMatchScores. Move=" +
          angular.toJson(move, true));
    }
    if (hasEndMatchScores && !noTurnIndexAfterMove) {
      throw new Error("Illegal move: you set endMatchScores but you didn't set turnIndexAfterMove to -1. Move=" +
          angular.toJson(move, true));
    }
  }

  const UNKNOWN_AVATAR = "https://yoav-zibin.github.io/emulator/imgs/autoMatchAvatar.png";
  function setPlayersInfo() {
    playersInfo = [];
    for (let i = 0; i < numberOfPlayers; i++) {
      let playerId =
        isOnlyAIs() ||
          i !== 0 && isPlayAgainstTheComputer() ?
          "" : // The playerId for the computer is "".
          "" + (i + 42);
      playersInfo.push({playerId : playerId, avatarImageUrl: UNKNOWN_AVATAR, displayName: null});
    }
  }

  function passMessage(msg: IMessageToGame, toIndex: number): void {
    let message: MessageFromTopIframe = {
      toGameIframeId: toIndex, toGameMessage: msg, 
      rows: null, cols: null
    };
    passMessageToParent(message);
  }
  function passMessageToParent(message: MessageFromTopIframe): void {
    console.info("Debug info: topIframe to platform sending: ", message);
    window.parent.postMessage(message, "*");
  }

  export function init($rootScope: angular.IScope) {
    console.info("TopIframe init");
    if (window.parent == window) {
      alert("This page can only be used from within another game");
      return;
    }
    $rootScope['emulator'] = emulatorTopIframe;
    causeLaginess();
    setPlayersInfo();
    loadSavedStates();
    clearState();
    window.addEventListener("message", (event)=>{
      $rootScope.$apply(()=>gotMessageFromGame(event));
    });
    reloadIframes();
  }

  function causeLaginess() {
    console.info("causeLaginess on purpose for 100 ms");
    // Some games use animations and guess when they end using $timeout, so I introduce
    // laginess on purpose to make it more like the real platform.
    setInterval(()=>{
      // just take the CPU for 80ms.
      let start = new Date().getTime();
      while (new Date().getTime() - start < 100) {}
    }, 100);
  }

  export function isGameOver() {
    return !!getState().endMatchScores;
  }
  export function getState(): IMove {
    return history[historyIndex];
  }
  function getPlayerIndex(id: number): number {
    if (isCommunity()) {
      // id = col + row*emulator.iframeCols;
      // iframeCols = playersInCommunity
      return Math.floor(id / iframeCols);
    } 
    if (isMultiplayer()) {
      return id == numberOfPlayers ? -2 : id; // -2 is viewer
    } 
    return getState().turnIndex;
  }
  function getUpdateUI(id: number): IUpdateUI {
    let index = getPlayerIndex(id);
    
    let state = getState();
    let updateUI: IUpdateUI = {
      // community matches
      numberOfPlayersRequiredToMove: isCommunity() ? numberOfPlayersRequiredToMove : null,
      playerIdToProposal: isCommunity() ? playerIdToProposal : null,

      yourPlayerIndex: index,
      yourPlayerInfo: index >= 0 ? playersInfo[index] : {
        avatarImageUrl: UNKNOWN_AVATAR,
        displayName: "Yoyo",
        playerId: "playerId" + id,
      },
      playersInfo: playersInfo,
      numberOfPlayers: numberOfPlayers,
      state: state.state,
      turnIndex: state.turnIndex,
      endMatchScores: state.endMatchScores,
      playMode: isMultiplayer() || isCommunity() ? index : playMode,
      matchType: playMode,
    };
    return updateUI;
  }

  function sendChangeUI(id: number) {
    passMessage({updateUI: getUpdateUI(id)}, id);
  }

  function getQueryString(params: StringIndexer): string {
    let res: string[] = [];
    for (let key in params) {
      let value = params[key];
      res.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    }
    return res.join("&");
  }
  function getImageMakerUrl(stateStr: string) {
    let params: StringIndexer = {};
    params["fbId0"] = "10153589934097337";
    params["fbId1"] = "10153693068502449";
    let state = getState();
    if (state.endMatchScores) {
      params["winner"] = state.endMatchScores[0] > state.endMatchScores[1] ? '0' : '1';;
    }
    params["myIndex"] = '0';
    params["state"] = stateStr;
    return ogImageMaker + "?" + getQueryString(params);
  }
  function gotMessageFromGame(event: MessageEvent) {
    let data: MessageToTopIframe = event.data;
    console.info("Debug info: topIframe got from platform: ", data);
    let id = data.gameIframeId;
    let index = getPlayerIndex(id);
    let message: IMessageToPlatform = data.fromGameMessage;
    console.info("Platform got message", message);
    if (message.gameReady) {
      sendSetLanguage(id);
      sendChangeUI(id);
    } else if (message.sendStateForOgImage) {
      let imageMakerUrl = getImageMakerUrl(message.sendStateForOgImage);
      console.info(imageMakerUrl);
      window.open(imageMakerUrl, "_blank");
    } else {
      // Check last message
      let lastUpdateUI: IUpdateUI = message.lastMessage.updateUI;
      if (!angular.equals(lastUpdateUI, getUpdateUI(id))) {
        console.warn("Ignoring message because message.lastMessage is wrong! This can happen if you play and immediately changed something like playMode. lastMessage.updateUI=", lastUpdateUI, " expected=", getUpdateUI(id));
        return;
      }
      // Check move&proposal
      let move: IMove = message.move;
      let proposal: IProposal = message.proposal;
      gameService.checkMakeMove(lastUpdateUI, move, proposal, message.chatDescription);
      if (index !== getState().turnIndex) {
        throw new Error("Not your turn! yourPlayerIndex=" + index + " and the turn is of playerIndex=" + getState().turnIndex);
      }
      // Update state&proposals
      if (historyIndex != history.length - 1) {
        // cut the future
        history.splice(historyIndex+1);
        playerIdToProposal = {};
      }
      if (historyIndex != history.length - 1) throw new Error("Internal err! historyIndex=" + historyIndex + " history.length=" + history.length);

      if (move) {
        history.push(move);
        historyIndex++;
        playerIdToProposal = {};
      } else {
        playerIdToProposal['playerId' + id] = proposal;
      }
      setTimeout(resendUpdateUIRespectingPingPong, 100);
    }
  }
}


angular.module('myApp', [])
  .run(['$rootScope',
  function ($rootScope: angular.IScope) {
    emulatorTopIframe.init($rootScope);
  }]);

}
