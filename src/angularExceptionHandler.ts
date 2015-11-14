let $rootScope: angular.IScope;
let $location: angular.ILocationService;
let $timeout: angular.ITimeoutService;
let $interval: angular.IIntervalService;
let $interpolate: angular.IInterpolateService;

angular.module('gameServices', ['translate'])
.run(
  ['$location', '$rootScope', '$timeout', '$interval', '$interpolate',
  function (_location: angular.ILocationService, _rootScope: angular.IScope,
    _timeout: angular.ITimeoutService, _interval: angular.IIntervalService,
    _interpolate: angular.IInterpolateService) {
  $location = _location;
  $rootScope = _rootScope;
  $timeout = _timeout;
  $interval = _interval;
  $interpolate = _interpolate;
  console.log("Finished init of gameServices");
}])
.factory('$exceptionHandler', function () {
  function angularErrorHandler(exception: any, cause: any): void {
    let errMsg = {
      gameUrl: '' + window.location,
      exception: "" + exception,
      stack: "" + (exception ? exception.stack : "no stack"),
      cause: cause,
      gameLogs: log.getLogs()
    };
    console.error("Game had an exception:\n", exception, " Full error message with logs: ", errMsg);
    window.alert("Game had an unexpected error. If you know JavaScript, you can look at the console and try to debug it :)");
    // To make sure students don't get:
    // Error: Uncaught DataCloneError: Failed to execute 'postMessage' on 'Window': An object could not be cloned.
    // I serialize to string and back.
    let plainPojoErr = angular.fromJson(angular.toJson(errMsg));
    window.parent.postMessage({emailJavaScriptError: plainPojoErr}, "*");
  }

  window.onerror = function (errorMsg: any, url: any, lineNumber: any, column: any, errorObj: any) {
    angularErrorHandler(errorObj,
        'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
        ' Column: ' + column);
  };

  return angularErrorHandler;
});
