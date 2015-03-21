'use strict';

angular.module('myApp', [])
.controller('PlatformCtrl',
    ["$sce", "$scope", "$rootScope", "$log", "$window", "$timeout", "platformMessageService",
      function ($sce, $scope, $rootScope, $log, $window, $timeout, platformMessageService) {

  var platformUrl = $window.location.search;
  var gameUrl = platformUrl.length > 1 ? platformUrl.substring(1) : null;
  if (gameUrl === null) {
    gameUrl = "http://yoav-zibin.github.io/emulator/realTimeExample.html";
    console.log("You should pass the game url like this: ...platform.html?<GAME_URL> , e.g., http://yoav-zibin.github.io/emulator/platform.html?http://yoav-zibin.github.io/snake/index.html");
  }
  $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);
  $scope.simulateServerDelayMilliseconds = "1000";
  var gotGameReadys = 0;
  var isOngoing = false;

  function sendMessageNowTo(index, msg) {
    platformMessageService.sendMessage(msg, "game_iframe" + index);
  }
  function sendMessageTo(index, msg) {
    $timeout(function () {
      sendMessageNowTo(index, msg);
    }, Number($scope.simulateServerDelayMilliseconds) * Math.random());
  }
  $scope.startNewMatch = function () {
    if (gotGameReadys !== 2) {
      return;
    }
    if (isOngoing) {
      var endMsg = {gotEndMatch: [0, 0]};
      sendMessageNowTo(0, endMsg);
      sendMessageNowTo(1, endMsg);
    }
    isOngoing = true;
    var playersInfo = [{playerId: 42}, {playerId: 43}];
    for (var index = 0; index < 2; index++) {
      sendMessageTo(index, {gotStartMatch: {playersInfo: playersInfo, yourPlayerIndex: index}});
    }
  };
  $scope.getStatus = function () {
    if (gotGameReadys !== 2) {
      return "Waiting for 'gameReady' message from two games...";
    }
    return isOngoing ? "Game on" : "Press 'New match'";
  };

  platformMessageService.addMessageListener(function (message, source) {
    var fromIndex = source === document.getElementById("game_iframe0").contentWindow ? 0 : 1;
    $log.info("from player index " + fromIndex);
    if (message.gameReady) {
      gotGameReadys++;
    } else if (message.sendReliableMessage || message.sendUnreliableMessage) {
      var msg = message.sendReliableMessage ? message.sendReliableMessage : message.sendUnreliableMessage;
      // Lose unreliable messages in 0.5 probability
      if (message.sendUnreliableMessage && Math.random() < 0.5) {
        return;
      }
      sendMessageTo(1 - fromIndex, {gotMessage: {fromPlayerIndex: fromIndex, message: msg}});
    } else if (message.endMatch) {
      isOngoing = false;
      var endMsg = {gotEndMatch: message.endMatch};
      sendMessageNowTo(0, endMsg);
      sendMessageNowTo(1, endMsg);
    } else {
      throw new Error("Platform got: " + angular.toJson(message, true));
    }
  });
}]);
