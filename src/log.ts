namespace gamingPlatform {
export module log {
  class ILogLevel {
    static ALWAYS: string = 'ALWAYS';
    static LOG: string = 'LOG';
    static INFO: string = 'INFO';
    static DEBUG: string = 'DEBUG';
    static WARN: string = 'WARN';
    static ERROR: string = 'ERROR';
  }
  interface ILogEntry {
    args: Object[];
    logLevel: string/*ILogLevel*/;
    millisecondsFromStart: number;
  }

  let alwaysLogs: ILogEntry[] = [];
  let lastLogs: ILogEntry[] = [];
  let startTime: number = getCurrentTime();

  export function getCurrentTime(): number {
    return window.performance ? window.performance.now() : new Date().getTime();
  }

  function getLogEntry(args: any[], logLevel: string, consoleFunc: any): ILogEntry {
    let millisecondsFromStart = getCurrentTime() - startTime;
    // Note that if the first argument to console.log is a string,
    // then it's supposed to be a format string, see:
    // https://developer.mozilla.org/en-US/docs/Web/API/Console/log
    // However, the output looks better on chrome if I pass a string as the first argument,
    // and I hope then it doesn't break anything anywhere else...
    let secondsFromStart = Math.round(millisecondsFromStart)/1000;
    let consoleArgs = ['', secondsFromStart, ' seconds:'].concat(args);
    consoleFunc.apply(console, consoleArgs);
    return {millisecondsFromStart: millisecondsFromStart, args: args, logLevel: logLevel};
  }

  function storeLog(args: any[], logLevel: string, consoleFunc: any): void {
    if (lastLogs.length > 100) {
      lastLogs.shift();
    }
    lastLogs.push(getLogEntry(args, logLevel, consoleFunc));
  }

  export function getLogs(): ILogEntry[] {
    return lastLogs.concat(alwaysLogs);
  }

  export function alwaysLog(... args: any[]):void {
    alwaysLogs.push(getLogEntry(args, ILogLevel.ALWAYS, console.log));
  }

  export function info(... args: any[]):void {
    storeLog(args, ILogLevel.INFO, console.log); // Not console.info on purpose: info is considered a warning in protractor.
  }

  export function debug(... args: any[]):void {
    storeLog(args, ILogLevel.DEBUG, console.debug);
  }

  export function warn(... args: any[]):void {
    storeLog(args, ILogLevel.WARN, console.warn);
  }

  export function error(... args: any[]):void {
    storeLog(args, ILogLevel.ERROR, console.error);
  }

  export function log(... args: any[]):void {
    storeLog(args, ILogLevel.LOG, console.log);
  }
}
}
