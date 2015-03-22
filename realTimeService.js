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
            if (playersInfo) {
              throw new Error("Got message.gotStartMatch before getting gotEndMatch");
            }
            playersInfo = message.gotStartMatch.playersInfo;
            if (!playersInfo || !playersInfo.length) {
              throw new Error("Got message.gotStartMatch where playersInfo wasn't a non-empty array");
            }
            game.gotStartMatch(message.gotStartMatch);
          } else if (message.gotMessage) {
            if (!playersInfo) {
              return;
            }
            if (playersInfo.length <= 1) {
              throw new Error("Got message.gotMessage in single-player.");
            }
            game.gotMessage(message.gotMessage);
          } else if (message.gotEndMatch) {
            playersInfo = null;
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
        game.gotStartMatch({playersInfo: playersInfo, yourPlayerIndex: 0, matchId: "someMatchIdForRandomSeed"});
      }, 2000);
    }

    function checkSendMessage(msg) {
      if (!msg || typeof msg !== "string") {
        throw new Error("When calling realTimeService.sendReliableMessage(message), " +
            "you must pass a non-empty string as the message.");
      }
      if (msg.length >= 1000) {
        console.log("CAREFUL: Maximum message length is 1000, but you passed a message of length " +
            msg.length + 
            ". The platform will try to zip the message, but if it is still big then the match will be ended in a tie");
      }
      if (!playersInfo) {
        throw new Error("You must not send a message before getting game.startMatch");
      }
      if (isLocalTesting || playersInfo.length === 1) {
        throw new Error("You must not send a message when a single player is playing.");
      }
    }

    function sendReliableMessage(msg) {
      checkSendMessage(msg);
      messageService.sendMessage({sendReliableMessage: msg});
    }

    function sendUnreliableMessage(msg) {
      checkSendMessage(msg);
      messageService.sendMessage({sendUnreliableMessage: msg});
    }

    function endMatch(endMatchScores) {
      if (!playersInfo) {
        throw new Error("You must not call realTimeService.endMatch(endMatchScores) before getting game.gotStartMatch");
      }
      if (!endMatchScores || endMatchScores.length !== playersInfo.length) {
        throw new Error("When calling realTimeService.endMatch(endMatchScores), " +
            "you must pass an array of the same length as the number of players in gotStartMatch.");
      }
      playersInfo = null;
      if (isLocalTesting) {
        $timeout(function () {
          $log.info("Calling game.gotEndMatch");
          game.gotEndMatch(endMatchScores);
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
