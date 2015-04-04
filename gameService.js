angular.module('myApp')
.service('gameService',
    ["$window", "$log", "stateService", "messageService",
      function($window, $log, stateService, messageService) {

    'use strict';

    var isLocalTesting = $window.parent === $window ||
        $window.location.search === "?test";

    // We verify that you call makeMove at most once for every updateUI (and only when it's your turn)
    var lastUpdateUI = null;
    function passUpdateUI(updateUI) {
      return function (params) {
        lastUpdateUI = params;
        updateUI(params);
      };
    }

    function makeMove(move) {
      $log.info(["Making move:", move]);
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
        stateService.makeMove(move);
      } else {
        messageService.sendMessage({makeMove: move});
      }
    }

    function createPlayersInfo(game) {
      var playersInfo = [];
      for (var i = 0; i < game.maxNumberOfPlayers; i++) {
        playersInfo.push({playerId : "" + (i + 42)});
      }
      return playersInfo;
    }

    function setGame(game) {
      $window.gameDeveloperEmail = game.gameDeveloperEmail;
      game.updateUI = passUpdateUI(game.updateUI);
      if (isLocalTesting) {
        stateService.setGame(game);
      } else {
        var isMoveOk = game.isMoveOk;
        var updateUI = game.updateUI;

        messageService.addMessageListener(function (message) {
          $window.lastMessage = message;
          if (message.isMoveOk !== undefined) {
            var isMoveOkResult = isMoveOk(message.isMoveOk);
            messageService.sendMessage({isMoveOkResult: isMoveOkResult});
          } else if (message.updateUI !== undefined) {
            lastUpdateUI = message.updateUI;
            updateUI(message.updateUI);
          }
        });

        // You can't send functions using postMessage.
        delete game.isMoveOk;
        delete game.updateUI;
        messageService.sendMessage({gameReady : game});

        // Show an empty board to a viewer (so you can't perform moves).
        $log.info("Passing a 'fake' updateUI message in order to show an empty board to a viewer (so you can NOT perform moves)");
        updateUI({
          move : [],
          turnIndexBeforeMove : 0,
          turnIndexAfterMove : 0,
          stateBeforeMove : null,
          stateAfterMove : {},
          yourPlayerIndex : -2,
          playersInfo : createPlayersInfo(game),
          playMode: "passAndPlay",
          endMatchScores: null
        });
      }
    }

    this.makeMove = makeMove;
    this.setGame = setGame;
}]);
