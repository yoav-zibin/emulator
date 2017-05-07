
// IState&IProposalData should be defined by the game, e.g., TicTacToe defines it as:
// interface IState { board: Board; delta: BoardDelta; }
type IState = any;
type IProposalData = any;
type SupportedLanguages = StringDictionary;

namespace gamingPlatform {

export interface IMessageToGame {
  updateUI?: IUpdateUI;
  setLanguage?: {language: string};
  getGameLogs?: boolean;
  getStateForOgImage?: boolean;
}
export interface IMessageToPlatform {
  gameReady?: string;
  move?: IMove;
  proposal?: IProposal;
  chatDescription?: string;
  lastMessage?: IMessageToGame;
  getGameLogsResult?: any;
  sendStateForOgImage?: string;
}


export module gameService {
  let isLocalTesting = window.parent === window;
  let game: IGame;

  function checkMove(move: IMove): void {
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
  export function checkMakeMove(lastUpdateUI: IUpdateUI, move: IMove, proposal: IProposal, chatDescription: string): void {
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

    if (!move && !proposal) {
      throw new Error("Game called makeMove with a null move=" + move + " and null proposal=" + proposal);
    }
    if (!move && !lastUpdateUI.playerIdToProposal) {
      throw new Error("Game called makeMove with a null move=" + move);
    }
    if (move) checkMove(move);

    if (!chatDescription) {
      console.error("You didn't set chatDescription in your makeMove! Please copy http://yoav-zibin.github.io/emulator/dist/turnBasedServices.4.js into your lib/turnBasedServices.4.js , and http://yoav-zibin.github.io/emulator/src/multiplayer-games.d.ts into your typings/multiplayer-games.d.ts , and make sure you pass chatDescription as the last argument to gameService.makeMove(move, proposal, chatDescription)");
    }
  }

  function sendMessage(msg: IMessageToPlatform) {
    // To make sure students don't get:
    // Error: Uncaught DataCloneError: Failed to execute 'postMessage' on 'Window': An object could not be cloned.
    // I serialize to string and back.
    // This also removes any $$hashkey that the game may have added:
    // http://stackoverflow.com/questions/18826320/what-is-the-hashkey-added-to-my-json-stringify-result
    let plainPojoMsg = angular.fromJson(angular.toJson(msg));
    messageService.sendMessage(plainPojoMsg);
  }

  function passMessage(msg: IMessageToGame, toIndex: number): void {
    let iframe = <HTMLIFrameElement> window.document.getElementById("game_iframe_" + toIndex);
    iframe.contentWindow.postMessage(msg, "*");
  }

  
  let lastUpdateUiMessage: IUpdateUI = null;

  export function makeMove(move: IMove, proposal: IProposal, chatDescription: string): void {
    checkMakeMove(lastUpdateUiMessage, move, proposal, chatDescription);
    sendMessage({move: move, proposal: proposal, chatDescription: chatDescription, lastMessage: {updateUI: lastUpdateUiMessage}}); 
    lastUpdateUiMessage = null; // to make sure you don't call makeMove until you get the next updateUI.
  }
  export function callUpdateUI(updateUI: IUpdateUI): void {
    lastUpdateUiMessage = angular.copy(updateUI);
    game.updateUI(updateUI);
  }

  function gotMessageFromPlatform(message: IMessageToGame): void {
    if (message.updateUI) {
      callUpdateUI(message.updateUI);

    } else if (message.setLanguage) {
      translate.setLanguage(message.setLanguage.language);
      
    } else if (message.getGameLogs) {
      setTimeout(function () {
        sendMessage({getGameLogsResult: log.getLogs()});
      });
      
    } else if (message.getStateForOgImage) {
      sendMessage({sendStateForOgImage : game.getStateForOgImage()});
    }
  }

  function createScriptWithCrossorigin(id: string, src: string) {
    log.info("Loading script ", src, " into script element with id=", id);
    if (document.getElementById(id)) {
      log.error("Already loaded src=", src);
      return;
    }
    
    let js: HTMLScriptElement = <HTMLScriptElement>document.createElement('script');
    js.src = src;
    js.id = id;
    js.onload = ()=>{
      log.info("Loaded script ", src);
      gamingPlatform.emulator.overrideInnerHtml();
    };
    (<any>js).async = 1;
    (<any>js).crossorigin = "anonymous"; 
    let fjs = document.getElementsByTagName('script')[0];
    fjs.parentNode.insertBefore(js, fjs);
  }

  let didCallSetGame = false;
  export function setGame(_game: IGame) {
    game = _game;
    if (didCallSetGame) {
      throw new Error("You can call setGame exactly once!");
    }
    didCallSetGame = true;
    log.info("Called setGame");
    if (isLocalTesting) {
      // waiting a bit because the game might access the html (like boardArea) to listen to TouchEvents
      $timeout(()=>{
        if (gamingPlatform.emulator) {
          gamingPlatform.emulator.overrideInnerHtml();
        } else {
          createScriptWithCrossorigin("emulator", "https://yoav-zibin.github.io/emulator/ts_output_readonly_do_NOT_change_manually/src/emulator.js")
        }
      }, 50); 
    } else {
      messageService.addMessageListener(gotMessageFromPlatform);
    }
    // I wanted to delay sending gameReady until window.innerWidth and height are not 0,
    // but they will stay 0 (on ios) until we send gameReady (because platform will hide the iframe)
    sendMessage({gameReady : "v4"});
    log.info("Calling 'fake' updateUI with yourPlayerIndex=-2 , meaning you're a viewer so you can't make a move");
    let playerInfo:IPlayerInfo = {playerId : '', avatarImageUrl: null, displayName: null};
    callUpdateUI({
      numberOfPlayersRequiredToMove: null,
      playerIdToProposal: null,
      yourPlayerIndex: -2,
      yourPlayerInfo: playerInfo,
      playersInfo: [playerInfo, playerInfo],
      numberOfPlayers: 2,
      state: null,
      turnIndex: 0,
      endMatchScores: null,
      playMode: "passAndPlay",
      matchType: "passAndPlay",
    });
  }
}

let typeCheck_gameService: IGameService = gameService;

}