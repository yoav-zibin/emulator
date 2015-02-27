'use strict';

angular.module('myApp')
.service('gameService', 
    ["$window", "$log", "stateService", "messageService", "$exceptionHandler",
      function($window, $log, stateService, messageService, $exceptionHandler) {

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
      $window.gameDeveloperEmail = game.gameDeveloperEmail;
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
            updateUI(message.updateUI);
          }
        });

        // You can't send functions using postMessage.
        delete game.isMoveOk;
        delete game.updateUI;
        messageService.sendMessage({gameReady : game});
      }
    }

    $window.addEventListener("keydown", function (event) {
      if (event.shiftKey  && event.ctrlKey) {
        if (event.keyCode === 66) {
          var msg = "User pressed on Ctrl+Shift+B";
          $exceptionHandler(new Error(msg), msg);
        }
      }
    });

    this.makeMove = makeMove;
    this.setGame = setGame;
}])
.factory('$exceptionHandler', 
    ["$window", "$log",
      function ($window, $log) {

  return function (exception, cause) {
    $log.info("Game had an exception:", exception, cause);
    var exceptionString = angular.toJson({exception: exception, cause: cause, lastMessage: $window.lastMessage}, true);
    var message = 
        {
          emailJavaScriptError: 
            {
              gameDeveloperEmail: $window.gameDeveloperEmail, 
              emailSubject: "Error in game " + $window.location, 
              emailBody: exceptionString
            }
        };
    $window.parent.postMessage(message, "*");
    $window.alert(exceptionString);
  };
}]);
