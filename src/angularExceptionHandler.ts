var $rootScope: angular.IScope;
var $location: angular.ILocationService;
var $timeout: angular.ITimeoutService;
var $interval: angular.IIntervalService;
var $interpolate: angular.IInterpolateService;

angular.module('myApp')
.run(['$location', '$rootScope', '$timeout', '$interval', '$interpolate',
function (_location: angular.ILocationService, _rootScope: angular.IScope,
    _timeout: angular.ITimeoutService, _interval: angular.IIntervalService,
    _interpolate: angular.IInterpolateService) {
  $location = _location;
  $rootScope = _rootScope;
  $timeout = _timeout;
  $interval = _interval;
  $interpolate = _interpolate;
}])
.factory('$exceptionHandler', function () {
  function angularErrorHandler(exception: any, cause: any): void {
    var lines: string[] = [];
    lines.push("Game URL: " + window.location);
    lines.push("exception: " + exception);
    lines.push("stackTrace: " + (exception && exception.stack ? exception.stack.replace(/\n/g,"\n\t") : "no stack trace :("));
    lines.push("cause: " + cause);
    lines.push("Last message: " + JSON.stringify(gameService.lastMessage));
    lines.push("Game logs: " + log.getLogs().replace(/\n/g,"\n\t"));
    var errStr = lines.join("\n\t");
    console.error("Game had an exception:\n", errStr);
    window.parent.postMessage({emailJavaScriptError: errStr}, "*");
  }

  window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
    angularErrorHandler(errorObj,
        'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
        ' Column: ' + column);
  };

  return angularErrorHandler;
});
