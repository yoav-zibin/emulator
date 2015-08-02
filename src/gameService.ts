
interface IPlayerInfo {
  avatarImageUrl: string;
  displayName: string;
  playerId: string;
}
interface IGame {
  isMoveOk(move: IIsMoveOk): boolean;
  updateUI(update: IUpdateUI): void;
  minNumberOfPlayers: number;
  maxNumberOfPlayers: number;
}

module gameService {
  var isLocalTesting = window.parent === window ||
      window.location.search === "?test";
  var playMode = location.search === "?onlyAIs" ? "onlyAIs"
      : location.search === "?playAgainstTheComputer" ? "playAgainstTheComputer" : "passAndPlay"; // Default play mode
  // We verify that you call makeMove at most once for every updateUI (and only when it's your turn)
  var lastUpdateUI: IUpdateUI = null;
  var game: IGame;

  function updateUI(params: IUpdateUI) {
    lastUpdateUI = params;
    game.updateUI(params);
  }

  export function makeMove(move: IMove): void {
    log.info(["Making move:", move]);
    if (!lastUpdateUI) {
      throw new Error("Game called makeMove before getting updateUI or it called makeMove more than once for a single updateUI.");
    }
    var wasYourTurn = lastUpdateUI.turnIndexAfterMove >= 0 && // game is ongoing
        lastUpdateUI.yourPlayerIndex === lastUpdateUI.turnIndexAfterMove; // it's my turn
    if (!wasYourTurn) {
      throw new Error("Game called makeMove when it wasn't your turn: yourPlayerIndex=" + lastUpdateUI.yourPlayerIndex + " turnIndexAfterMove=" + lastUpdateUI.turnIndexAfterMove);
    }
    if (!move || !move.length) {
      throw new Error("Game called makeMove with an empty move=" + move);
    }
    lastUpdateUI = null; // to make sure you don't call makeMove until you get the next updateUI.

    if (isLocalTesting) {
      $timeout(function () {
        stateService.makeMove(move);
      }, 100);
    } else {
      messageService.sendMessage({makeMove: move});
    }
  }

  function getPlayers(): IPlayerInfo[] {
    var playersInfo: IPlayerInfo[] = [];
    var actualNumberOfPlayers =
        stateService.randomFromTo(game.minNumberOfPlayers, game.maxNumberOfPlayers + 1);
    for (var i = 0; i < actualNumberOfPlayers; i++) {
      var playerId =
        playMode === "onlyAIs" ||
          i !== 0 && playMode === "playAgainstTheComputer" ?
          "" : // The playerId for the computer is "".
          "" + (i + 42);
      playersInfo.push({playerId : playerId, avatarImageUrl: null, displayName: null});
    }
    return playersInfo;
  }

  export var lastMessage: any;

  var didCallSetGame = false;
  export function setGame(_game: IGame) {
    game = _game;
    if (didCallSetGame) {
      throw new Error("You can call setGame exactly once!");
    }
    didCallSetGame = true;
    var playersInfo = getPlayers();
    if (isLocalTesting) {
      stateService.setPlayMode(playMode);
      stateService.setPlayers(playersInfo);
      stateService.setGame({updateUI: updateUI, isMoveOk: game.isMoveOk});
      stateService.sendUpdateUi();
    } else {
      var isMoveOk = game.isMoveOk;
      var updateUI = game.updateUI;

      messageService.addMessageListener(function (message) {
        lastMessage = message;
        if (message.isMoveOk !== undefined) {
          var isMoveOkResult: any = isMoveOk(message.isMoveOk);
          if (isMoveOkResult !== true) {
            isMoveOkResult = {result: isMoveOkResult, isMoveOk: message.isMoveOk};
          }
          messageService.sendMessage({isMoveOkResult: isMoveOkResult});
        } else if (message.updateUI !== undefined) {
          lastUpdateUI = message.updateUI;
          updateUI(message.updateUI);
        }
      });
      messageService.sendMessage({gameReady : {}});

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
