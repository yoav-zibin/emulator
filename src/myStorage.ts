module myStorage {
  function makeShort(str: string): string {
    return str && str.length > 25 ? str.substring(0, 20) + " ..." : str;
  }

  export function getItem(key: string): any {
    if (!window.localStorage) {
      return null;
    }
    var stringValue = window.localStorage.getItem(key);
    log.info("myStorage.getItem(", key, ") returned ", makeShort(stringValue));
    return stringValue ? angular.fromJson(stringValue) : null;
  }

  export function setItem(key: string, value: any): void {
    if (!value) {
      throw new Error("Doesn't make sense to store null in myStorage!");
    }
    if (window.localStorage) {
      var stringValue = angular.toJson(value);
      log.info("myStorage.setItem(", key, ",", makeShort(stringValue), ")");
      window.localStorage.setItem(key, stringValue);
    }
  }
}
