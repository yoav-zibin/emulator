module log {
  interface IError {
    stack?: string;
  }
  interface LogEntry {
    time: number;
    args: any[];
  }

  var alwaysLogs: LogEntry[] = [];
  var lastLogs: LogEntry[] = [];
  var startTime: number = getCurrentTime();

  export function getCurrentTime(): number {
    return window.performance ? window.performance.now() : new Date().getTime();
  }

  function getLogEntry(args: any[]): LogEntry {
    return {time: getCurrentTime() - startTime, args: args};
  }

  function storeLog(args: any[]): void {
    if (lastLogs.length > 100) {
      lastLogs.shift();
    }
    lastLogs.push(getLogEntry(args));
  }

  function convertLogEntriesToStrings(logs: LogEntry[], lines: string[]) {
    // In reverse order (in case the email gets truncated)
    for (var i: number = logs.length - 1; i >= 0; i--) {
      var entry: LogEntry = logs[i];
      var stringArgs: String[] = [];
      for (var j = 0; j < entry.args.length; j++) {
        var arg: any = entry.args[j];
        var stringArg: string = "" + arg;
        if (stringArg === "[object Object]") {
          stringArg = JSON.stringify(arg);
        }
        stringArgs.push(stringArg);
      }
      lines.push("Time " + (entry.time / 1000).toFixed(3) + ": " + stringArgs.join(","));
    }
  }

  export function getLogs():string {
    var lines: string[] = [];
    lines.push("Always-logs:\n");
    convertLogEntriesToStrings(alwaysLogs, lines);
    lines.push("\n\nRecent-logs:\n");
    convertLogEntriesToStrings(lastLogs, lines);
    return lines.join('\n');
  }

  export function alwaysLog(... args: any[]):void {
    alwaysLogs.push(getLogEntry(args));
    console.info.apply(console, args);
  }

  export function info(... args: any[]):void {
    storeLog(args);
    console.info.apply(console, args);
  }

  export function debug(... args: any[]):void {
    storeLog(args);
    console.debug.apply(console, args);
  }

  export function warn(... args: any[]):void {
    storeLog(args);
    console.warn.apply(console, args);
  }

  export function error(... args: any[]):void {
    storeLog(args);
    console.error.apply(console, args);
  }

  export function log(... args: any[]):void {
    storeLog(args);
    console.log.apply(console, args);
  }
}
