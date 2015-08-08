var $rootScope: angular.IScope;
var $location: angular.ILocationService;
var $timeout: angular.ITimeoutService;
var $interval: angular.IIntervalService;
var $interpolate: angular.IInterpolateService;

angular.module('myApp')
.service('initGameServices',
  ['$location', '$rootScope', '$timeout', '$interval', '$interpolate',
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
    var errMsg = {
      gameUrl: window.location,
      exception: exception,
      cause: cause,
      lastMessage: gameService.lastMessage,
      gameLogs: log.getLogs()
    };
    console.error("Game had an exception:\n", errMsg);
    window.parent.postMessage({emailJavaScriptError: errMsg}, "*");
    window.alert("Game had an unexpected error. If you know JavaScript, you can look at the console and try to debug it :)");
  }

  window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
    angularErrorHandler(errorObj,
        'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
        ' Column: ' + column);
  };

  return angularErrorHandler;
});
