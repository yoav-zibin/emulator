var gamingPlatform;
(function (gamingPlatform) {
    // Preventing context menu on long taps: http://stackoverflow.com/questions/3413683/disabling-the-context-menu-on-long-taps-on-android
    window.oncontextmenu = function (event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    };
    angular.module('gameServices', ['translate'])
        .config(['$provide', function ($provide) {
            // angular-material has a ton of
            // Error: [$rootScope:inprog] http://errors.angularjs.org/1.5.5/$rootScope/inprog?p0=%24digest
            // see: https://github.com/angular/material/issues/8245
            // And I even got it once in yCheckers:
            // Error: [$rootScope:inprog] $digest already in progress http://errors.angularjs.org/1.5.5/$rootScope/inprog?p0=%24digest
            $provide.decorator('$rootScope', [
                '$delegate', function ($delegate) {
                    $delegate.unsafeOldApply = $delegate.$apply;
                    $delegate.$apply = function (fn) {
                        var phase = $delegate.$$phase;
                        if (phase === "$apply" || phase === "$digest") {
                            if (fn && typeof fn === 'function') {
                                fn();
                            }
                        }
                        else {
                            $delegate.unsafeOldApply(fn);
                        }
                    };
                    return $delegate;
                }
            ]);
        }])
        .run(['$location', '$rootScope', '$timeout', '$interval', '$interpolate', '$compile', '$sce',
        function (_location, _rootScope, _timeout, _interval, _interpolate, _compile, _sce) {
            gamingPlatform.$location = _location;
            gamingPlatform.$rootScope = _rootScope;
            gamingPlatform.$timeout = _timeout;
            gamingPlatform.$interval = _interval;
            gamingPlatform.$interpolate = _interpolate;
            gamingPlatform.$compile = _compile;
            gamingPlatform.$sce = _sce;
            gamingPlatform.log.alwaysLog("Finished init of gameServices module; emulatorServicesCompilationDate=", emulatorServicesCompilationDate);
        }])
        .factory('$exceptionHandler', function () {
        var didSendBugReport = false;
        function isLocalHost() {
            return location.hostname === "localhost" || location.protocol === "file:";
        }
        function angularErrorHandler(exception, cause) {
            var errMsg = {
                gameUrl: '' + window.location,
                exception: "" + exception,
                stack: "" + (exception ? exception.stack : "no stack"),
                cause: cause,
                gameLogs: gamingPlatform.log.getLogs()
            };
            console.error("Game had an exception:\n", exception, " Full error message with logs: ", errMsg);
            if (didSendBugReport)
                return;
            didSendBugReport = true;
            if (isLocalHost())
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
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=angularExceptionHandler.js.map