angular.module('myApp')
  .service('messageService',
      ["$window", "$log", "$rootScope",
        function($window, $log, $rootScope) {

    'use strict';

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
  }])
  .factory('$exceptionHandler',
      ["$window", "$log",
        function ($window, $log) {

    'use strict';

    return function (exception, cause) {
      $log.error("Game had an exception:", exception, cause);
      var exceptionString = angular.toJson({exception: exception, stackTrace: exception.stack, cause: cause, lastMessage: $window.lastMessage}, true);
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
      throw exception;
    };
  }]);
