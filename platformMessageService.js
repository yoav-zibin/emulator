'use strict';

angular.module('myApp')
.service('platformMessageService',
    ["$window", "$log", "$rootScope",
      function($window, $log, $rootScope) {
  this.sendMessage = function (message, gameIframeId) {
    $log.info("Platform sent message", message);
    $window.document.getElementById(gameIframeId ? gameIframeId : "game_iframe")
      .contentWindow.postMessage(message, "*");
  };
  this.addMessageListener = function (listener) {
    $window.addEventListener("message", function (event) {
      $rootScope.$apply(function () {
        var message = event.data;
        $log.info("Platform got message", message);
        listener(message, event.source);
      });
    }, false);
  };
}]);
