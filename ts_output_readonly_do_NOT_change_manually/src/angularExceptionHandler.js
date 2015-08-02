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
        var lines = [];
        lines.push("Game URL: " + window.location);
        lines.push("exception: " + exception);
        lines.push("stackTrace: " + (exception && exception.stack ? exception.stack.replace(/\n/g, "\n\t") : "no stack trace :("));
        lines.push("cause: " + cause);
        lines.push("Last message: " + JSON.stringify(gameService.lastMessage));
        lines.push("Game logs: " + log.getLogs().replace(/\n/g, "\n\t"));
        var errStr = lines.join("\n\t");
        console.error("Game had an exception:\n", errStr);
        window.parent.postMessage({ emailJavaScriptError: errStr }, "*");
    }
    window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
        angularErrorHandler(errorObj, 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
            ' Column: ' + column);
    };
    return angularErrorHandler;
});
