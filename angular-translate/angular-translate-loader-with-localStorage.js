/*!
 * angular-translate - v2.6.1
 * I changed it and added local storage.
 */
angular.module('pascalprecht.translate')
.factory('$translateStaticFilesLoader', ['$q', '$http', function ($q, $http) {
  var finishListener;
  var result = function (options) {

    if (!options || (!angular.isArray(options.files) && (!angular.isString(options.prefix) || !angular.isString(options.suffix)))) {
      throw new Error('Couldn\'t load static files, no files and prefix or suffix specified!');
    }

    if (!options.files) {
      options.files = [{
        prefix: options.prefix,
        suffix: options.suffix
      }];
    }

    var load = function (file) {
      if (!file || (!angular.isString(file.prefix) || !angular.isString(file.suffix))) {
        throw new Error('Couldn\'t load static file, no prefix or suffix specified!');
      }

      var deferred = $q.defer();
      var url = [
            file.prefix,
            options.key,
            file.suffix
          ].join('');
      $http(angular.extend({
        url: url,
        method: 'GET',
        params: ''
      }, options.$http)).success(function (data) {
        if (window.localStorage) { // ADDED
          console.log("Storing translations for ", url, " data=", data);
          window.localStorage.setItem(url, angular.toJson(data));
        }
        deferred.resolve(data);
      }).error(function (notUsed) {
        if (window.localStorage) { // ADDED
          var data = window.localStorage.getItem(url);
          console.log("Load translations from local-storage for ", url, " data=", data);
          if (data) {
            deferred.resolve(angular.fromJson(data));
            return;
          }
        }
        deferred.reject(options.key);
      });

      return deferred.promise;
    };

    var deferred = $q.defer(),
        promises = [],
        length = options.files.length;

    for (var i = 0; i < length; i++) {
      promises.push(load({
        prefix: options.files[i].prefix,
        key: options.key,
        suffix: options.files[i].suffix
      }));
    }

    $q.all(promises).then(function (data) {
      var length = data.length,
          mergedData = {};

      for (var i = 0; i < length; i++) {
        for (var key in data[i]) {
          mergedData[key] = data[i][key];
        }
      }

      deferred.resolve(mergedData);
    }, function (data) {
      deferred.reject(data);
    });
    result.finishListener = deferred.promise;
    return result.finishListener;
  };
  return result;
}]);
