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
    function getCurrentTime() {
        return window.performance ? window.performance.now() : new Date().getTime();
    }
    log_1.getCurrentTime = getCurrentTime;
    function getLogEntry(args, logLevel) {
        return { millisecondsFromStart: getCurrentTime() - startTime, args: args, logLevel: logLevel };
    }
    function storeLog(args, logLevel) {
        if (lastLogs.length > 100) {
            lastLogs.shift();
        }
        lastLogs.push(getLogEntry(args, logLevel));
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
        alwaysLogs.push(getLogEntry(args, ILogLevel.ALWAYS));
        console.info.apply(console, args);
    }
    log_1.alwaysLog = alwaysLog;
    function info() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.INFO);
        console.info.apply(console, args);
    }
    log_1.info = info;
    function debug() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.DEBUG);
        console.debug.apply(console, args);
    }
    log_1.debug = debug;
    function warn() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.WARN);
        console.warn.apply(console, args);
    }
    log_1.warn = warn;
    function error() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.ERROR);
        console.error.apply(console, args);
    }
    log_1.error = error;
    function log() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.LOG);
        console.log.apply(console, args);
    }
    log_1.log = log;
})(log || (log = {}));
