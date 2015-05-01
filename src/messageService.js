angular.module('myApp')
  .service('messageService',
      ["$window", "logSaver", "$rootScope",
        function($window, logSaver, $rootScope) {

    'use strict';

    var gameUrl = location.toString();
    this.sendMessage = function (message) {
      logSaver.info("Game sent message", message);
      message.gameUrl = gameUrl;
      $window.parent.postMessage(message, "*");
    };
    this.addMessageListener = function (listener) {
      $window.addEventListener("message", function (event) {
        var source = event.source;
        if (source !== $window.parent) {
          return;
        }
        var message = event.data;
        logSaver.info("Game got message", message);
        $rootScope.$apply(function () {
          listener(message);
        });
      }, false);
    };
  }])
  .factory('$exceptionHandler',
      ["$window", "logSaver",
        function ($window, logSaver) {

    'use strict';

    function angularErrorHandler(exception, cause) {
      var lines = [];
      lines.push("Game URL: " + $window.location);
      lines.push("exception: " + exception);
      lines.push("stackTrace: " + (exception && exception.stack ? exception.stack.replace(/\n/g,"\n\t") : "no stack trace :("));
      lines.push("cause: " + cause);
      lines.push("Game logs: " + logSaver.getLogs().replace(/\n/g,"\n\t"));
      var errStr = lines.join("\n\t");
      console.error("Game had an exception:\n", errStr);
      $window.parent.postMessage({emailJavaScriptError: errStr}, "*");
    }

    window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
      angularErrorHandler(errorObj,
          'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
          ' Column: ' + column);
    };

    return angularErrorHandler;
  }]);
