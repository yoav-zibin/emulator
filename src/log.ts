module log {
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

  function getLogEntry(args: any[], logLevel: string): ILogEntry {
    return {millisecondsFromStart: getCurrentTime() - startTime, args: args, logLevel: logLevel};
  }

  function storeLog(args: any[], logLevel: string): void {
    if (lastLogs.length > 100) {
      lastLogs.shift();
    }
    lastLogs.push(getLogEntry(args, logLevel));
  }

  export function getLogs(): ILogEntry[] {
    return lastLogs.concat(alwaysLogs);
  }

  export function alwaysLog(... args: any[]):void {
    alwaysLogs.push(getLogEntry(args, ILogLevel.ALWAYS));
    console.info.apply(console, args);
  }

  export function info(... args: any[]):void {
    storeLog(args, ILogLevel.INFO);
    console.info.apply(console, args);
  }

  export function debug(... args: any[]):void {
    storeLog(args, ILogLevel.DEBUG);
    console.debug.apply(console, args);
  }

  export function warn(... args: any[]):void {
    storeLog(args, ILogLevel.WARN);
    console.warn.apply(console, args);
  }

  export function error(... args: any[]):void {
    storeLog(args, ILogLevel.ERROR);
    console.error.apply(console, args);
  }

  export function log(... args: any[]):void {
    storeLog(args, ILogLevel.LOG);
    console.log.apply(console, args);
  }
}
