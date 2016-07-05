namespace gamingPlatform {

export interface StringDictionary {
  [index: string]: string;
}
export interface IPlayerInfo {
  avatarImageUrl: string;
  displayName: string;
  playerId: string;
}
export interface IGame {
  isMoveOk(move: IIsMoveOk): boolean;
  updateUI(update: IUpdateUI): void;
  gotMessageFromPlatform(message: any): void;
  getStateForOgImage(): string;
  minNumberOfPlayers: number;
  maxNumberOfPlayers: number;
}

export module gameService {
  let isLocalTesting = window.parent === window ||
      window.location.search === "?test";
  export let playMode = location.search.indexOf("onlyAIs") !== -1 ? "onlyAIs"
      : location.search.indexOf("playAgainstTheComputer") !== -1 ? "playAgainstTheComputer"
      : location.search.indexOf("?playMode=") === 0 ? location.search.substr("?playMode=".length)
      : "passAndPlay"; // Default play mode
  // We verify that you call makeMove at most once for every updateUI (and only when it's your turn)
  let lastUpdateUI: IUpdateUI = null;
  let game: IGame;

  export function updateUI(params: IUpdateUI) {
    lastUpdateUI = angular.copy(params);
    game.updateUI(params);
  }

  export function makeMove(move: IMove): void {
    if (!lastUpdateUI) {
      throw new Error("Game called makeMove before getting updateUI or it called makeMove more than once for a single updateUI.");
    }
    let wasYourTurn = lastUpdateUI.turnIndexAfterMove >= 0 && // game is ongoing
        lastUpdateUI.yourPlayerIndex === lastUpdateUI.turnIndexAfterMove; // it's my turn
    if (!wasYourTurn) {
      throw new Error("Game called makeMove when it wasn't your turn: yourPlayerIndex=" + lastUpdateUI.yourPlayerIndex + " turnIndexAfterMove=" + lastUpdateUI.turnIndexAfterMove);
    }
    if (!move || !move.length) {
      throw new Error("Game called makeMove with an empty move=" + move);
    }
    if (isLocalTesting) {
      // I'm using $timeout so it will be more like production (where we use postMessage),
      // so the updateUI response is not sent immediately).
      $timeout(function () {
        stateService.makeMove(move);
      }, 10);
    } else {
      messageService.sendMessage({makeMove: move, lastUpdateUI: lastUpdateUI});
    }
    lastUpdateUI = null; // to make sure you don't call makeMove until you get the next updateUI.
  }

  function getPlayers(): IPlayerInfo[] {
    let playersInfo: IPlayerInfo[] = [];
    let actualNumberOfPlayers =
        stateService.randomFromTo(game.minNumberOfPlayers, game.maxNumberOfPlayers + 1);
    for (let i = 0; i < actualNumberOfPlayers; i++) {
      let playerId =
        playMode === "onlyAIs" ||
          i !== 0 && playMode === "playAgainstTheComputer" ?
          "" : // The playerId for the computer is "".
          "" + (i + 42);
      playersInfo.push({playerId : playerId, avatarImageUrl: null, displayName: null});
    }
    return playersInfo;
  }

  let didCallSetGame = false;
  let w: any = window;
  export function setGame(_game: IGame) {
    game = _game;
    if (didCallSetGame) {
      throw new Error("You can call setGame exactly once!");
    }
    didCallSetGame = true;
    let playersInfo = getPlayers();
    if (isLocalTesting) {
      if (w.game) {
        w.game.isHelpModalShown = true;
      }
      stateService.setGame({updateUI: updateUI, isMoveOk: game.isMoveOk});
      stateService.initNewMatch();
      stateService.setPlayMode(playMode);
      stateService.setPlayers(playersInfo);
      stateService.sendUpdateUi();
    } else {
      messageService.addMessageListener(function (message) {
        if (message.isMoveOk) {
          let isMoveOkResult: any = game.isMoveOk(message.isMoveOk);
          if (isMoveOkResult !== true) {
            isMoveOkResult = {result: isMoveOkResult, isMoveOk: message.isMoveOk};
          }
          messageService.sendMessage({isMoveOkResult: isMoveOkResult});
        } else if (message.updateUI) {
          updateUI(message.updateUI);
        } else if (message.setLanguage) {
          translate.setLanguage(message.setLanguage.language, message.setLanguage.codeToL10N);
          // we need to ack this message to the platform so the platform will make the game-iframe visible
          // (The platform waited until the game got the l10n.)
          // Using setTimeout to give time for angular to refresh it's UI (the default was in English)
          setTimeout(function () {
            messageService.sendMessage({setLanguageResult: true});
          })
          
        } else if (message.getGameLogs) {
          // To make sure students don't get:
          // Error: Uncaught DataCloneError: Failed to execute 'postMessage' on 'Window': An object could not be cloned.
          // I serialize to string and back.
          let plainPojoLogs = angular.fromJson(angular.toJson(log.getLogs()));
          setTimeout(function () {
            messageService.sendMessage({getGameLogsResult: plainPojoLogs});
          });
          
        } else if (message.passMessageToGame) {
          let msgFromPlatform = message.passMessageToGame;
          if (msgFromPlatform.SHOW_GAME_INSTRUCTIONS && w.game) {
            w.game.isHelpModalShown = !w.game.isHelpModalShown;
          }
          if (game.gotMessageFromPlatform) game.gotMessageFromPlatform(msgFromPlatform);
          console.log("msgFromPlatform.getStateForOgImage=", msgFromPlatform.getStateForOgImage, game.getStateForOgImage); // TODO: delete
          if (msgFromPlatform.getStateForOgImage && game.getStateForOgImage) {
            messageService.sendMessage({sendStateForOgImage : game.getStateForOgImage()});
          }
        }
      });
      // I wanted to delay sending gameReady until window.innerWidth and height are not 0,
      // but they will stay 0 (on ios) until we send gameReady (because platform will hide the iframe)
      messageService.sendMessage({gameReady : {}});
    }

    // Show an empty board to a viewer (so you can't perform moves).
    log.info("Passing a 'fake' updateUI message in order to show an empty board to a viewer (so you can NOT perform moves)");
    updateUI({
      move : [],
      turnIndexBeforeMove : 0,
      turnIndexAfterMove : 0,
      stateBeforeMove : null,
      stateAfterMove : {},
      yourPlayerIndex : -2,
      playersInfo : playersInfo,
      playMode: "passAndPlay",
      endMatchScores: null,
      moveNumber: 0, randomSeed:"",
      numberOfPlayers: playersInfo.length
    });
  }
}

}
