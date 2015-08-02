var myStorage;
(function (myStorage) {
    function makeShort(str) {
        return str && str.length > 25 ? str.substring(0, 20) + " ..." : str;
    }
    function getItem(key) {
        if (!window.localStorage) {
            return null;
        }
        var stringValue = window.localStorage.getItem(key);
        log.info("myStorage.getItem(", key, ") returned ", makeShort(stringValue));
        return stringValue ? angular.fromJson(stringValue) : null;
    }
    myStorage.getItem = getItem;
    function setItem(key, value) {
        if (!value) {
            throw new Error("Doesn't make sense to store null in myStorage!");
        }
        if (window.localStorage) {
            var stringValue = angular.toJson(value);
            log.info("myStorage.setItem(", key, ",", makeShort(stringValue), ")");
            window.localStorage.setItem(key, stringValue);
        }
    }
    myStorage.setItem = setItem;
})(myStorage || (myStorage = {}));
