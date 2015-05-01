angular.module('myApp')
.service('logSaver', function () {
  'use strict';

  function getCurrentTime() {
    return window.performance ? window.performance.now() : new Date().getTime();
  }

  var alwaysLogs = [];
  var lastLogs = [];
  var startTime = getCurrentTime();

  function getLogEntry(args) {
    return {time: getCurrentTime() - startTime, args: args};
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
          stringArg = angular.toJson(arg);
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

  function alwaysLog() {
    alwaysLogs.push(getLogEntry(arguments));
    console.info.apply(console, arguments);
  }

  function info() {
    storeLog(arguments);
    console.info.apply(console, arguments);
  }

  function debug() {
    storeLog(arguments);
    console.debug.apply(console, arguments);
  }

  function warn() {
    storeLog(arguments);
    console.warn.apply(console, arguments);
  }

  function error() {
    storeLog(arguments);
    console.error.apply(console, arguments);
  }

  function log() {
    storeLog(arguments);
    console.log.apply(console, arguments);
  }

  alwaysLog("emulatorServicesCompilationDate=" + emulatorServicesCompilationDate);
  
  this.getCurrentTime = getCurrentTime;
  this.getLogs = getLogs;
  this.alwaysLog = alwaysLog;
  this.info = info;
  this.debug = debug;
  this.error = error;
  this.warn = warn;
  this.log = log;
});
