var log;
(function (log_1) {
    var alwaysLogs = [];
    var lastLogs = [];
    var startTime = getCurrentTime();
    function getCurrentTime() {
        return window.performance ? window.performance.now() : new Date().getTime();
    }
    log_1.getCurrentTime = getCurrentTime;
    function getLogEntry(args) {
        return { time: getCurrentTime() - startTime, args: args };
    }
    function storeLog(args) {
        if (lastLogs.length > 100) {
            lastLogs.shift();
        }
        lastLogs.push(getLogEntry(args));
    }
    function convertLogEntriesToStrings(logs, lines) {
        // In reverse order (in case the email gets truncated)
        for (var i = logs.length - 1; i >= 0; i--) {
            var entry = logs[i];
            var stringArgs = [];
            for (var j = 0; j < entry.args.length; j++) {
                var arg = entry.args[j];
                var stringArg = "" + arg;
                if (stringArg === "[object Object]") {
                    stringArg = JSON.stringify(arg);
                }
                stringArgs.push(stringArg);
            }
            lines.push("Time " + (entry.time / 1000).toFixed(3) + ": " + stringArgs.join(","));
        }
    }
    function getLogs() {
        var lines = [];
        lines.push("Always-logs:\n");
        convertLogEntriesToStrings(alwaysLogs, lines);
        lines.push("\n\nRecent-logs:\n");
        convertLogEntriesToStrings(lastLogs, lines);
        return lines.join('\n');
    }
    log_1.getLogs = getLogs;
    function alwaysLog() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        alwaysLogs.push(getLogEntry(args));
        console.info.apply(console, args);
    }
    log_1.alwaysLog = alwaysLog;
    function info() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.info.apply(console, args);
    }
    log_1.info = info;
    function debug() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.debug.apply(console, args);
    }
    log_1.debug = debug;
    function warn() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.warn.apply(console, args);
    }
    log_1.warn = warn;
    function error() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.error.apply(console, args);
    }
    log_1.error = error;
    function log() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.log.apply(console, args);
    }
    log_1.log = log;
})(log || (log = {}));
