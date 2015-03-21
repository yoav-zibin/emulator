'use strict';

angular.module('myApp')
.service('platformMessageService',
    ["$window", "$log", "$rootScope",
      function($window, $log, $rootScope) {
  this.sendMessage = function (message, gameIframeId) {
    var iframeId = gameIframeId ? gameIframeId : "game_iframe";
    $log.info("Platform sent message", message, " to ", iframeId);
    $window.document.getElementById(iframeId)
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
