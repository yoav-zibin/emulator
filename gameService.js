'use strict';

angular.module('myApp')
.service('gameService', function($window, $log, stateService, messageService) {
    var isLocalTesting = $window.parent === $window
        || $window.location.search === "?test";

    function makeMove(move) {
      $log.info(["Making move:", move]);
      if (isLocalTesting) {
        stateService.makeMove(move);
      } else {
        messageService.sendMessage({makeMove: move});
      }
    }

    function setGame(game) {
      if (isLocalTesting) {
        stateService.setGame(game);
      } else {
        var isMoveOk = game.isMoveOk;
        var updateUI = game.updateUI;

        messageService.addMessageListener(function (message) {
          if (message.isMoveOk !== undefined) {
            var isMoveOkResult = isMoveOk(message.isMoveOk);
            messageService.sendMessage({isMoveOkResult: isMoveOkResult});
          } else if (message.updateUI !== undefined) {
            updateUI(message.updateUI);
          }
        });

        // You can't send functions using postMessage.
        delete game.isMoveOk;
        delete game.updateUI;
        messageService.sendMessage({gameReady : game});
      }
    }

    this.makeMove = makeMove;
    this.setGame = setGame;
});
