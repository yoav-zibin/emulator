var $rootScope;
var $location;
var $timeout;
var $interval;
var $interpolate;
angular.module('myApp')
    .service('initGameServices', ['$location', '$rootScope', '$timeout', '$interval', '$interpolate',
    function (_location, _rootScope, _timeout, _interval, _interpolate) {
        $location = _location;
        $rootScope = _rootScope;
        $timeout = _timeout;
        $interval = _interval;
        $interpolate = _interpolate;
    }])
    .factory('$exceptionHandler', function () {
    function angularErrorHandler(exception, cause) {
        var errMsg = {
            gameUrl: window.location,
            exception: exception,
            cause: cause,
            lastMessage: gameService.lastMessage,
            gameLogs: log.getLogs()
        };
        console.error("Game had an exception:\n", errMsg);
        window.parent.postMessage({ emailJavaScriptError: errMsg }, "*");
        window.alert("Game had an unexpected error. If you know JavaScript, you can look at the console and try to debug it :)");
    }
    window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
        angularErrorHandler(errorObj, 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
            ' Column: ' + column);
    };
    return angularErrorHandler;
});
