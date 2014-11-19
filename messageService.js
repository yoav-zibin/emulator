'use strict';

angular.module('myApp')
  .service('messageService', function($window, $log, $rootScope) {
    this.sendMessage = function (message) {
      $log.info("Game sent message", message);
      $window.parent.postMessage(message, "*");
    };
    this.addMessageListener = function (listener) {
      $window.addEventListener("message", function (event) {
        var source = event.source;
        if (source !== $window.parent) {
          return;
        }
        $rootScope.$apply(function () {
          var message = event.data;
          $log.info("Game got message", message);
          listener(message);
        });
      }, false);
    };
  });
