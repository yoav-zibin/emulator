'use strict';

angular.module('myApp', [])
.controller('PlatformCtrl',
    ["$sce", "$scope", "$rootScope", "$log", "$window", "platformMessageService",
      function ($sce, $scope, $rootScope, $log, $window, platformMessageService) {

  var platformUrl = $window.location.search;
  var gameUrl = platformUrl.length > 1 ? platformUrl.substring(1) : null;
  if (gameUrl === null) {
    gameUrl = "http://yoav-zibin.github.io/emulator/realTimeExample.html";
    console.log("You should pass the game url like this: ...platform.html?<GAME_URL> , e.g., http://yoav-zibin.github.io/emulator/platform.html?http://yoav-zibin.github.io/snake/index.html");
  }
  $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);
  var gotGameReadys = 0;
  var isOngoing = false;

  function sendMessageTo(index, msg) {
    platformMessageService.sendMessage(msg, "game_iframe" + index);
  }
  $scope.startNewMatch = function () {
    if (gotGameReadys !== 2) {
      return;
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
    if (message.gameReady) {
      gotGameReadys++;
    } else if (message.sendReliableMessage || message.sendUnreliableMessage) {
      var msg = message.sendReliableMessage ? message.sendReliableMessage : message.sendUnreliableMessage;
      console.log(source, source === document.getElementById("game_iframe0").contentWindow, source === document.getElementById("game_iframe0"));
      //sendMessageTo(, {gotMessage: {fromPlayerIndex, message})});
    } else {
      throw new Error("Platform got: " + angular.toJson(message, true));
    }
  });
}]);
