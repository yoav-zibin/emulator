var $rootScope;
var $location;
var $timeout;
var $interval;
var $interpolate;
angular.module('gameServices', ['translate'])
    .run(['$location', '$rootScope', '$timeout', '$interval', '$interpolate',
    function (_location, _rootScope, _timeout, _interval, _interpolate) {
        $location = _location;
        $rootScope = _rootScope;
        $timeout = _timeout;
        $interval = _interval;
        $interpolate = _interpolate;
        log.alwaysLog("Finished init of gameServices module; emulatorServicesCompilationDate=", emulatorServicesCompilationDate);
    }])
    .factory('$exceptionHandler', function () {
    function angularErrorHandler(exception, cause) {
        var errMsg = {
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
        var plainPojoErr = angular.fromJson(angular.toJson(errMsg));
        window.parent.postMessage({ emailJavaScriptError: plainPojoErr }, "*");
    }
    window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
        angularErrorHandler(errorObj, 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
            ' Column: ' + column);
    };
    return angularErrorHandler;
});
