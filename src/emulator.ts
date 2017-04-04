namespace gamingPlatform {

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

export module emulator {
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
  export let numberOfPlayersRequiredToMove = 3; // for community matches.
  export let numberOfPlayers = 2;
  export let iframeRows = 1;
  export let iframeCols = 1;
  export let locationTrustedStr: any = null;
  let playersInfo: IPlayerInfo[];
  export let history: IMove[] = [];
  export let historyIndex = 0;
  let playerIdToProposal: IProposals = null;
  export let savedStates: SavedState[] = [];
  export let selectedSavedStateToLoad: SavedState = null;
  export let showEnterJson = false;
  export let pastedUpdateUiJson: string = '{"state": null, "turnIndex": 0, "endMatchScores": null}';

  // TODO:
  // * move to iframe (so this html won't be affected by the game.css)
  // * test getLogs.
  let testingHtml = `
    <style>
    * {
      font-size: 12px !important;
      margin: 0px !important;
      padding: 0px !important;
    }
    </style>
    <div style="position:absolute; width:100%; height:10%; overflow: scroll;">
      <h4 ng-show="emulator.isGameOver()">endMatchScores={{emulator.getState().endMatchScores}}</h4>
      <select
        ng-options="playMode for playMode in emulator.playModes track by playMode"
        ng-model="emulator.playMode"
        ng-change="emulator.reloadIframes()"></select>
      <button ng-click="emulator.startNewMatch()">Start new match</button>
      <select ng-change="emulator.historyIndexChanged()" ng-model="emulator.historyIndex" ng-options="index for index in emulator.getIntegersTill(emulator.history.length)">
        <option value="">-- current move --</option>
      </select>
      <select ng-change="emulator.currentLanguageChanged()" ng-model="emulator.currentLanguage" ng-options="language.name for language in emulator.supportedLanguages">
        <option value="">-- current game language --</option>
      </select>
      <button ng-click="emulator.saveState()">Save match</button>
      <select ng-change="emulator.loadMatch()" ng-model="emulator.selectedSavedStateToLoad" ng-options="savedState.name for savedState in emulator.savedStates">
        <option value="">-- load match --</option>
      </select>
      <button ng-click="emulator.showEnterJson = true">Load match from JSON</button>
      <input ng-model="emulator.ogImageMaker">
      <button ng-click="emulator.getOgImageState()">Open AppEngine image</button>
      <div ng-show="emulator.playMode == 'community'">
        Number of players required to move in a community match: 
        <input ng-model="emulator.numberOfPlayersRequiredToMove" 
          ng-change="emulator.reloadIframes()">
      </div>
    </div>
    <div ng-show="emulator.showEnterJson" style="z-index:100; position:absolute; width:100%; height:90%; top:10%; overflow: scroll;">
      <textarea ng-model="emulator.pastedUpdateUiJson" style="position:absolute; width:100%; height:90%;"></textarea><br>
      <button ng-click="emulator.loadMatchFromJson()" style="position:absolute; width:100%; height:10%; top:90%;">Load match from JSON</button>
    </div>
    <div style="position:absolute; width:100%; height:90%; top: 10%;">
      <div ng-repeat="row in emulator.getIntegersTill(emulator.iframeRows)"
          style="position:absolute; top:{{row * 100 / emulator.iframeRows}}%; left:0; width:100%; height:{{100 / emulator.iframeRows}}%;">
        <div ng-repeat="col in emulator.getIntegersTill(emulator.iframeCols)"
            style="position:absolute; top:0; left:{{col * 100 / emulator.iframeCols}}%; width:{{100 / emulator.iframeCols}}%; height:100%;">
          <iframe id="game_iframe_{{col + row*emulator.iframeCols}}"
            ng-src="{{emulator.locationTrustedStr}}"
            seamless="seamless" style="position:absolute; width:100%; height:100%; left:0; top:0;">
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
        iframeCols = numberOfPlayers; // if I want to support a viewer, then add +1.
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
  function checkMakeMove(lastUpdateUI: IUpdateUI, move: IMove, proposal: IProposal): void {
    if (!lastUpdateUI) {
      throw new Error("Game called makeMove before getting updateUI or it called makeMove more than once for a single updateUI.");
    }
    let wasYourTurn = lastUpdateUI.turnIndex >= 0 && // game is ongoing
        lastUpdateUI.yourPlayerIndex === lastUpdateUI.turnIndex; // it's my turn
    if (!wasYourTurn) {
      throw new Error("Game called makeMove when it wasn't your turn: yourPlayerIndex=" + lastUpdateUI.yourPlayerIndex + " turnIndexAfterMove=" + lastUpdateUI.turnIndex);
    }

    if (lastUpdateUI.playerIdToProposal) {
      let oldProposal = lastUpdateUI.playerIdToProposal[lastUpdateUI.yourPlayerInfo.playerId]; 
      if (oldProposal) {
        throw new Error("Called communityMove when yourPlayerId already made a proposal, see: " + angular.toJson(oldProposal, true));  
      }
    }

    if (move) {
      checkMove(move);
    }
    if (proposal && !proposal.chatDescription) {
      throw new Error("You didn't set chatDescription in your proposal=" + angular.toJson(proposal, true));
    }
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

  export function overrideInnerHtml() {
    log.info("Overriding body's html");
    $rootScope['emulator'] = emulator;
    setPlayersInfo();
    loadSavedStates();
    clearState();
    locationTrustedStr = $sce.trustAsResourceUrl(location.toString());
    let el = angular.element(testingHtml);
    window.document.body.innerHTML = '';
    angular.element(window.document.body).append($compile(el)($rootScope));
    window.addEventListener("message", (event)=>{
      $rootScope.$apply(()=>gotMessageFromGame(event));
    });
  }
  export function isGameOver() {
    return !!getState().endMatchScores;
  }
  export function getState(): IMove {
    return history[historyIndex];
  }
  function getPlayerIndex(id: number): number {
    if (playMode == "community") {
      // id = col + row*emulator.iframeCols;
      // iframeCols = playersInCommunity
      return Math.floor(id / iframeCols);
    } 
    if (playMode == "multiplayer") {
      return id == numberOfPlayers ? -2 : id; // -2 is viewer
    } 
    return getState().turnIndex;
  }
  function getUpdateUI(id: number): IUpdateUI {
    let index = getPlayerIndex(id);
    
    let state = getState();
    let isCommunity = playMode == "community";
    let updateUI: IUpdateUI = {
      // community matches
      numberOfPlayersRequiredToMove: isCommunity ? numberOfPlayersRequiredToMove : null,
      playerIdToProposal: isCommunity ? playerIdToProposal : null,

      yourPlayerIndex: index,
      yourPlayerInfo: {
        avatarImageUrl: "",
        displayName: "",
        playerId: "playerId" + id,
      },
      playersInfo: playersInfo,
      numberOfPlayers: numberOfPlayers,
      state: state.state,
      turnIndex: state.turnIndex,
      endMatchScores: state.endMatchScores,
      playMode: playMode == "multiplayer" || isCommunity ? index : playMode,
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
      let lastUpdateUI: IUpdateUI = message.lastMessage.updateUI;
      if (!angular.equals(lastUpdateUI, getUpdateUI(id))) {
        console.warn("Ignoring message because message.lastMessage is wrong! This can happen if you play and immediately changed something like playMode. lastMessage.updateUI=", lastUpdateUI, " expected=", getUpdateUI(id));
        return;
      }
      // Check move&proposal
      let move: IMove = message.move;
      let proposal: IProposal = message.proposal;
      checkMakeMove(lastUpdateUI, move, proposal);
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
}

}