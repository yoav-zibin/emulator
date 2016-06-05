namespace gamingPlatform {

// Copy everything on gamingPlatform to window,
// for backward compatability with games that don't use the gamingPlatform namespace.
function copyNamespaceToWindow() {
  let w: any = window;
  let g: any = gamingPlatform;
  for (let key in g) {
    w[key] = g[key];
  }
}
copyNamespaceToWindow();
setTimeout(copyNamespaceToWindow, 0);

// Preventing context menu on long taps: http://stackoverflow.com/questions/3413683/disabling-the-context-menu-on-long-taps-on-android
window.oncontextmenu = function(event) {
  event.preventDefault();
  event.stopPropagation();
  return false;
};

export let $rootScope: angular.IScope;
export let $location: angular.ILocationService;
export let $timeout: angular.ITimeoutService;
export let $interval: angular.IIntervalService;
export let $interpolate: angular.IInterpolateService;

declare var emulatorServicesCompilationDate: string;

angular.module('gameServices', ['translate'])
.config(['$provide', function($provide: any) {
  // angular-material has a ton of
  // Error: [$rootScope:inprog] http://errors.angularjs.org/1.5.5/$rootScope/inprog?p0=%24digest
  // see: https://github.com/angular/material/issues/8245
  // And I even got it once in yCheckers:
  // Error: [$rootScope:inprog] $digest already in progress http://errors.angularjs.org/1.5.5/$rootScope/inprog?p0=%24digest
  $provide.decorator('$rootScope', [
    '$delegate', function($delegate: any) {
      $delegate.unsafeOldApply = $delegate.$apply;
      $delegate.$apply = function(fn: any) {
        var phase = $delegate.$$phase;
        if (phase === "$apply" || phase === "$digest") {
          if (fn && typeof fn === 'function') {
            fn();
          }
        } else {
          $delegate.unsafeOldApply(fn);
        }
      };
      return $delegate;
    }
  ]);
}])
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
  copyNamespaceToWindow();
  log.alwaysLog("Finished init of gameServices module; emulatorServicesCompilationDate=", emulatorServicesCompilationDate);
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

}
