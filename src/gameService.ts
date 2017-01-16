
// IState&IProposalData should be defined by the game, e.g., TicTacToe defines it as:
// interface IState { board: Board; delta: BoardDelta; }
type IState = any;
type IProposalData = any;
type SupportedLanguages = StringDictionary;

namespace gamingPlatform {

interface IMessageToGame {
  communityUI?: ICommunityUI;
  updateUI?: IUpdateUI;
  setLanguage?: {language: string};
  getGameLogs?: boolean;
  getStateForOgImage?: boolean;
}
interface IMessageToPlatform {
  gameReady?: string;
  move?: IMove;
  proposal?: IProposal;
  lastMessage?: IMessageToGame;
  getGameLogsResult?: any;
  sendStateForOgImage?: string;
}

interface SavedState {
  name: string;
  history: IMove[];
  playerIdToProposal: IProposals;
}
interface Language {
  name: string;
  code: string;
}
interface StringIndexer {
   [name: string]: string;
}

export module gameService {
  let isLocalTesting = window.parent === window;

  // UI for local testing
  const playersInCommunity = 5;
  export let playModes = ["passAndPlay", "playAgainstTheComputer", "onlyAIs", "multiplayer", "community"];
  export let playMode = "passAndPlay";
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
  export let numberOfPlayers = 2;
  export let iframeRows = 1;
  export let iframeCols = 1;
  export let locationTrustedStr: any = null;
  let game: IGame;
  let playersInfo: IPlayerInfo[];
  export let history: IMove[] = [];
  export let historyIndex = 0;
  let playerIdToProposal: IProposals = null;
  export let savedStates: SavedState[] = [];
  export let selectedSavedStateToLoad: SavedState = null;

  // test ogImage, getLogs, etc
  let testingHtml = `
    <div style="position:absolute; width:100%; height:10%; overflow: scroll;">
      <select
        ng-options="playMode for playMode in gameService.playModes track by playMode"
        ng-model="gameService.playMode"
        ng-change="gameService.reloadIframes()"></select>
      <button ng-click="gameService.startNewMatch()">Start new match</button>
      <select ng-change="gameService.historyIndexChanged()" ng-model="gameService.historyIndex" ng-options="index for index in gameService.getIntegersTill(gameService.history.length)">
        <option value="">-- current move --</option>
      </select>
      <select ng-change="gameService.currentLanguageChanged()" ng-model="gameService.currentLanguage" ng-options="language.name for language in gameService.supportedLanguages">
        <option value="">-- current game language --</option>
      </select>
      <button ng-click="gameService.saveState()">Save match</button>
      <select ng-change="gameService.loadMatch()" ng-model="gameService.selectedSavedStateToLoad" ng-options="savedState.name for savedState in gameService.savedStates">
        <option value="">-- load match --</option>
      </select>
      <input ng-model="gameService.ogImageMaker">
      <button ng-click="gameService.getOgImageState()">Open AppEngine image</button>
    </div>
    <div style="position:absolute; width:100%; height:90%; top: 10%;">
      <div ng-repeat="row in gameService.getIntegersTill(gameService.iframeRows)"
          style="position:absolute; top:{{row * 100 / gameService.iframeRows}}%; left:0; width:100%; height:{{100 / gameService.iframeRows}}%;">
        <div ng-repeat="col in gameService.getIntegersTill(gameService.iframeCols)"
            style="position:absolute; top:0; left:{{col * 100 / gameService.iframeCols}}%; width:{{100 / gameService.iframeCols}}%; height:100%;">
          <iframe id="game_iframe_{{col + row*gameService.iframeCols}}"
            ng-src="{{gameService.locationTrustedStr}}"
            seamless="seamless" style="position:absolute; width:100%; height:100%;">
          </iframe>
        </div>
      </div>
    </div>
  `;

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
    reloadIframes();
  }
  export function startNewMatch() {
    clearState();
    reloadIframes();
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
  export function loadMatch() {
    if (!selectedSavedStateToLoad) return;
    history = angular.copy(selectedSavedStateToLoad.history);
    historyIndex = history.length - 1;
    playerIdToProposal = angular.copy(selectedSavedStateToLoad.playerIdToProposal);
    selectedSavedStateToLoad = null;
    reloadIframes();
  }
  function loadSavedStates() {
    let savedStatesJson = localStorage.getItem("savedStates");
    if (savedStatesJson) savedStates = angular.fromJson(savedStatesJson);
  }

  export function getOgImageState() {
    passMessage({getStateForOgImage: true}, 0);
  }

  export function reloadIframes() {
    log.log("reloadIframes: playMode=", playMode);
    setPlayersInfo();
    // Setting to 0 to force the game to send gameReady and then it will get the correct changeUI.
    iframeRows = 0;
    iframeCols = 0;
    $timeout(()=>{
      if (playMode == "community") {
        iframeRows = numberOfPlayers;
        iframeCols = playersInCommunity;
      } else if (playMode == "multiplayer") {
        iframeRows = 1;
        iframeCols = numberOfPlayers + 1;
      } else {
        iframeRows = 1;
        iframeCols = 1;
      }
    });
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
  function checkMakeMove(lastUpdateUI: IUpdateUI, move: IMove): void {
    if (!lastUpdateUI) {
      throw new Error("Game called makeMove before getting updateUI or it called makeMove more than once for a single updateUI.");
    }
    let wasYourTurn = lastUpdateUI.turnIndex >= 0 && // game is ongoing
        lastUpdateUI.yourPlayerIndex === lastUpdateUI.turnIndex; // it's my turn
    if (!wasYourTurn) {
      throw new Error("Game called makeMove when it wasn't your turn: yourPlayerIndex=" + lastUpdateUI.yourPlayerIndex + " turnIndexAfterMove=" + lastUpdateUI.turnIndex);
    }
    checkMove(move);
  }
  function checkCommunityMove(lastCommunityUI: ICommunityUI, proposal: IProposal, move: IMove): void {
    if (!lastCommunityUI) {
      throw new Error("Don't call communityMove before getting communityUI.");
    }
    if (move) {
      checkMove(move);
    }
    let wasYourTurn = lastCommunityUI.turnIndex >= 0 && // game is ongoing
        lastCommunityUI.yourPlayerIndex === lastCommunityUI.turnIndex; // it's my turn
    if (!wasYourTurn) {
      throw new Error("Called communityMove when it wasn't your turn: yourPlayerIndex=" + lastCommunityUI.yourPlayerIndex + " turnIndexAfterMove=" + lastCommunityUI.turnIndex);
    }
    let oldProposal = lastCommunityUI.playerIdToProposal[lastCommunityUI.yourPlayerInfo.playerId]; 
    if (oldProposal) {
      throw new Error("Called communityMove when yourPlayerId already made a proposal, see: " + angular.toJson(oldProposal, true));  
    }
  }

  function sendMessage(msg: IMessageToPlatform) {
    messageService.sendMessage(msg);
  }

  function setPlayersInfo() {
    playersInfo = [];
    for (let i = 0; i < numberOfPlayers; i++) {
      let playerId =
        playMode === "onlyAIs" ||
          i !== 0 && playMode === "playAgainstTheComputer" ?
          "" : // The playerId for the computer is "".
          "" + (i + 42);
      playersInfo.push({playerId : playerId, avatarImageUrl: null, displayName: null});
    }
  }

  function passMessage(msg: IMessageToGame, toIndex: number): void {
    let iframe = <HTMLIFrameElement> window.document.getElementById("game_iframe_" + toIndex);
    iframe.contentWindow.postMessage(msg, "*");
  }
  function getIndexOfSource(src: Window) {
    let i = 0;
    while (true) {
      let iframe = <HTMLIFrameElement> window.document.getElementById("game_iframe_" + i);
      if (!iframe) {
        console.error("Can't find src=", src);
        return -1;
      }
      if (iframe.contentWindow === src) return i;
      i++;
    }
  }

  function overrideInnerHtml() {
    log.info("Overriding body's html");
    locationTrustedStr = $sce.trustAsResourceUrl(location.toString());
    let el = angular.element(testingHtml);
    window.document.body.innerHTML = '';
    angular.element(window.document.body).append($compile(el)($rootScope));
    window.addEventListener("message", (event)=>{
      $rootScope.$apply(()=>gotMessageFromGame(event));
    });
  }
  function getState():IMove {
    return history[historyIndex];
  }
  function getPlayerIndex(id: number): number {
    if (playMode == "community") {
      // id = col + row*gameService.iframeCols;
      // iframeCols = playersInCommunity
      return Math.floor(id / iframeCols);
    } 
    if (playMode == "multiplayer") {
      return id == numberOfPlayers ? -2 : id; // -2 is viewer
    } 
    return getState().turnIndex;
  }
  function getChangeUI(id: number):IMessageToGame {
    let index = getPlayerIndex(id);
    
    let state = getState();
    if (playMode == "community") {
      let communityUI: ICommunityUI = {
        yourPlayerIndex: index,
        yourPlayerInfo: {
          avatarImageUrl: "",
          displayName: "",
          playerId: "playerId" + id,
        },
        playerIdToProposal: playerIdToProposal,
        numberOfPlayers: numberOfPlayers,
        state: state.state,
        turnIndex: state.turnIndex,
        endMatchScores: state.endMatchScores,
      };
      return {communityUI: communityUI};
    }
    let updateUI: IUpdateUI = {
      yourPlayerIndex: index,
      playersInfo: playersInfo,
      numberOfPlayers: numberOfPlayers,
      state: state.state,
      turnIndex: state.turnIndex,
      endMatchScores: state.endMatchScores,
      playMode: playMode == "multiplayer" ? index : playMode,
    };
    return {updateUI: updateUI};
  }

  function sendChangeUI(id: number) {
    passMessage(getChangeUI(id), id);
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
    let source = event.source;
    let id = getIndexOfSource(source);
    if (id == -1) return;
    let index = getPlayerIndex(id);
    let message: IMessageToPlatform = event.data;
    log.info("Platform got message", message);
    if (message.gameReady) {
      sendSetLanguage(id);
      sendChangeUI(id);
    } else if (message.sendStateForOgImage) {
      let imageMakerUrl = getImageMakerUrl(message.sendStateForOgImage);
      log.info(imageMakerUrl);
      window.open(imageMakerUrl, "_blank");
    } else {
      // Check last message
      let lastMessage: IMessageToGame = message.lastMessage;
      if (!angular.equals(lastMessage, getChangeUI(id))) {
        console.warn("Ignoring message because message.lastMessage is wrong! This can happen if you play and immediately changed something like playMode. lastMessage=", lastMessage, " expected lastMessage=", getChangeUI(id));
        return;
      }
      // Check move&prposal
      let move: IMove = message.move;
      let proposal: IProposal = message.proposal;
      if (lastMessage.communityUI) {
        checkCommunityMove(lastMessage.communityUI, proposal, move);
      } else {
        checkMakeMove(lastMessage.updateUI, move);
      }
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
      setTimeout(()=>{
        for (let r = 0; r < iframeRows; r++) {
          for (let c = 0; c < iframeCols; c++) {
            let id = c + r*iframeCols;
            sendChangeUI(id);
          }
        }
      }, 100);
    }
  }

  
  let lastChangeUiMessage: IMessageToGame = null;
  export function communityMove(proposal: IProposal, move: IMove): void {
    checkCommunityMove(lastChangeUiMessage.communityUI, proposal, move);
    // I'm sending the move even in local testing to make sure it's simple json (or postMessage will fail).
    sendMessage({proposal: proposal, move: move, lastMessage: lastChangeUiMessage});
    lastChangeUiMessage = null;
  }

  export function makeMove(move: IMove): void {
    checkMakeMove(lastChangeUiMessage.updateUI, move);
    // I'm sending the move even in local testing to make sure it's simple json (or postMessage will fail).
    sendMessage({move: move, lastMessage: lastChangeUiMessage}); 
    lastChangeUiMessage = null; // to make sure you don't call makeMove until you get the next updateUI.
  }
  export function callUpdateUI(updateUI: IUpdateUI): void {
    lastChangeUiMessage = angular.copy({updateUI: updateUI});
    game.updateUI(updateUI);
  }
  export function callCommunityUI(communityUI: ICommunityUI): void {
    lastChangeUiMessage = angular.copy({communityUI: communityUI});
    game.communityUI(communityUI);
  }

  function gotMessageFromPlatform(message: IMessageToGame): void {
    if (message.communityUI) {
      callCommunityUI(message.communityUI);

    } else if (message.updateUI) {
      callUpdateUI(message.updateUI);

    } else if (message.setLanguage) {
      translate.setLanguage(message.setLanguage.language);
      
    } else if (message.getGameLogs) {
      // To make sure students don't get:
      // Error: Uncaught DataCloneError: Failed to execute 'postMessage' on 'Window': An object could not be cloned.
      // I serialize to string and back.
      let plainPojoLogs = angular.fromJson(angular.toJson(log.getLogs()));
      setTimeout(function () {
        sendMessage({getGameLogsResult: plainPojoLogs});
      });
      
    } else if (message.getStateForOgImage) {
      sendMessage({sendStateForOgImage : game.getStateForOgImage()});
    }
  }

  let didCallSetGame = false;
  export function setGame(_game: IGame) {
    game = _game;
    setPlayersInfo();
    loadSavedStates();
    clearState();
    if (didCallSetGame) {
      throw new Error("You can call setGame exactly once!");
    }
    didCallSetGame = true;
    log.info("Called setGame");
    if (isLocalTesting) {
      $rootScope['gameService'] = gameService;
      $timeout(overrideInnerHtml, 50); // waiting a bit because the game might access the html (like boardArea) to listen to TouchEvents
    } else {
      messageService.addMessageListener(gotMessageFromPlatform);
    }
    // I wanted to delay sending gameReady until window.innerWidth and height are not 0,
    // but they will stay 0 (on ios) until we send gameReady (because platform will hide the iframe)
    sendMessage({gameReady : "v4"});
    log.info("Calling 'fake' updateUI with yourPlayerIndex=-2 , meaning you're a viewer so you can't make a move");
    callUpdateUI({
      yourPlayerIndex: -2,
      playersInfo: playersInfo,
      numberOfPlayers: numberOfPlayers,
      state: null,
      turnIndex: 0,
      endMatchScores: null,
      playMode: "passAndPlay",
    });
  }
}

let typeCheck_gameService: IGameService = gameService;

}