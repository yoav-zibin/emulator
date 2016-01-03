var gamingPlatform;
(function (gamingPlatform) {
    var log;
    (function (log_1) {
        var ILogLevel = (function () {
            function ILogLevel() {
            }
            ILogLevel.ALWAYS = 'ALWAYS';
            ILogLevel.LOG = 'LOG';
            ILogLevel.INFO = 'INFO';
            ILogLevel.DEBUG = 'DEBUG';
            ILogLevel.WARN = 'WARN';
            ILogLevel.ERROR = 'ERROR';
            return ILogLevel;
        })();
        var alwaysLogs = [];
        var lastLogs = [];
        var startTime = getCurrentTime();
        var isProtractor = location.search.indexOf('isProtractor=true') !== -1;
        function getCurrentTime() {
            return window.performance ? window.performance.now() : new Date().getTime();
        }
        log_1.getCurrentTime = getCurrentTime;
        function getLogEntry(args, logLevel, consoleFunc) {
            var millisecondsFromStart = getCurrentTime() - startTime;
            // Note that if the first argument to console.log is a string,
            // then it's supposed to be a format string, see:
            // https://developer.mozilla.org/en-US/docs/Web/API/Console/log
            // The output looks better on chrome if I pass a string as the first argument,
            // and I hope then it doesn't break anything anywhere else...
            var secondsFromStart = Math.round(millisecondsFromStart) / 1000;
            var consoleArgs = ['', secondsFromStart, ' seconds:'].concat(args);
            if (!isProtractor) {
                consoleFunc.apply(console, consoleArgs);
            }
            else {
                // Protractor only gets the first argument of console.log, and it converts it to
                // a string (not with toJson), so the output is not helpful, e.g.,
                // AppEngine had an error: ,[object Object]
                // See:
                // https://github.com/angular/protractor/issues/2390
                // So I convert everything to a nice json string.
                // I don't do it all the time (but only in protractor tests) because:
                // * it's expensive
                // * some arguments (such as dom elements) are outputed on the developer console better than json.
                consoleFunc.apply(console, ['' + secondsFromStart + ' seconds:' + angular.toJson(consoleArgs, true)]);
            }
            return { millisecondsFromStart: millisecondsFromStart, args: args, logLevel: logLevel };
        }
        function storeLog(args, logLevel, consoleFunc) {
            if (lastLogs.length > 100) {
                lastLogs.shift();
            }
            lastLogs.push(getLogEntry(args, logLevel, consoleFunc));
        }
        function getLogs() {
            return lastLogs.concat(alwaysLogs);
        }
        log_1.getLogs = getLogs;
        function alwaysLog() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            alwaysLogs.push(getLogEntry(args, ILogLevel.ALWAYS, console.log));
        }
        log_1.alwaysLog = alwaysLog;
        function info() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            storeLog(args, ILogLevel.INFO, console.log); // Not console.info on purpose: info is considered a warning in protractor.
        }
        log_1.info = info;
        function debug() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            storeLog(args, ILogLevel.DEBUG, console.debug);
        }
        log_1.debug = debug;
        function warn() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            storeLog(args, ILogLevel.WARN, console.warn);
        }
        log_1.warn = warn;
        function error() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            storeLog(args, ILogLevel.ERROR, console.error);
        }
        log_1.error = error;
        function log() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            storeLog(args, ILogLevel.LOG, console.log);
        }
        log_1.log = log;
    })(log = gamingPlatform.log || (gamingPlatform.log = {}));
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=log.js.map