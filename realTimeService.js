angular.module('myApp')
.service('realTimeService',
    ["$window", "$log", "$timeout", "messageService",
      function($window, $log, $timeout, messageService) {

    'use strict';

    var isLocalTesting = $window.parent === $window ||
        $window.location.search === "?test";

    var game = null;
    var playersInfo = null; // This is not null iff there is an ongoing game.

    function setGame(_game) {
      if (game) {
        throw new Error("You can call realTimeService.setGame(game) exactly once!");
      }
      game = _game;
      $window.gameDeveloperEmail = game.gameDeveloperEmail;
      if (!game || !game.gotStartMatch || !game.gotMessage || !game.gotEndMatch) {
        throw new Error("When calling realTimeService.setGame(game), " +
            "you must pass a game that has these 3 methods: gotStartMatch, gotMessage, and gotEndMatch.");
      }
      if (isLocalTesting) {
        sendLocalTestingStartMatch();
      } else {
        messageService.addMessageListener(function (message) {
          $window.lastMessage = message;
          if (message.gotStartMatch) {
            playersInfo = message.gotStartMatch.playersInfo;
            if (!playersInfo || !playersInfo.length) {
              throw new Error("Got message.gotStartMatch where playersInfo wasn't a non-empty array");
            }
            game.gotStartMatch(message.gotStartMatch);
          } else if (message.gotMessage) {
            game.gotMessage(message.gotMessage);
          } else if (message.gotEndMatch) {
            if (!playersInfo) {
              throw new Error("Got gotEndMatch without getting gotStartMatch");
            }
            game.gotEndMatch(message.gotEndMatch);
          } else {
            throw new Error("Unknown message: " + angular.toJson(message));
          }
        });
        messageService.sendMessage({gameReady: true});
      }
    }

    function sendLocalTestingStartMatch() {
      $timeout(function () {
        $log.info("Calling game.gotStartMatch");
        playersInfo = [{playerId: 42}];
        game.gotStartMatch({playersInfo: playersInfo, yourPlayerIndex: 0});
      }, 2000);
    }

    function sendReliableMessage(msg) {
      if (!msg || typeof msg !== "string") {
        throw new Error("When calling realTimeService.sendReliableMessage(message), " +
            "you must pass a non-empty string as the message.");
      }
      if (!playersInfo) {
        throw new Error("You must not call realTimeService.sendReliableMessage(message) before getting game.startMatch");
      }
      if (isLocalTesting || playersInfo.length === 1) {
        throw new Error("You must not call realTimeService.sendReliableMessage(message) when a single player is playing.");
      } else {
        messageService.sendMessage({sendReliableMessage: msg});
      }
    }

    function sendUnreliableMessage(msg) {
      if (!msg || typeof msg !== "string") {
        throw new Error("When calling realTimeService.sendUnreliableMessage(message), " +
            "you must pass a non-empty string as the message.");
      }
      if (!playersInfo) {
        throw new Error("You must not call realTimeService.sendUnreliableMessage(message) before getting game.startMatch");
      }
      if (isLocalTesting || playersInfo.length === 1) {
        throw new Error("You must not call realTimeService.sendUnreliableMessage(message) when a single player is playing.");
      } else {
        messageService.sendMessage({sendUnreliableMessage: msg});
      }
    }

    function endMatch(endMatchScores) {
      if (!playersInfo) {
        throw new Error("You must not call realTimeService.endMatch(endMatchScores) before getting game.gotStartMatch");
      }
      if (!endMatchScores || endMatchScores.length !== playersInfo.length) {
        throw new Error("When calling realTimeService.endMatch(endMatchScores), " +
            "you must pass an array of the same length as the number of players in gotStartMatch.");
      }
      if (isLocalTesting) {
        $timeout(function () {
          game.gotEndMatch(endMatchScores);
          playersInfo = null;
          sendLocalTestingStartMatch();
        }, 1000);
      } else {
        messageService.sendMessage({endMatch: endMatchScores});
      }
    }

    this.setGame = setGame;
    this.sendReliableMessage = sendReliableMessage;
    this.sendUnreliableMessage = sendUnreliableMessage;
    this.endMatch = endMatch;
}]);
