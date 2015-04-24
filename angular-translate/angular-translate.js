(function () {
  'use strict';

  if (!angular) {
    throw new Error('You must first include angular: <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
  }
  if (!angular.isArray(window.angularTranslationLanguages)) {
    throw new Error("You must include angularTranslate like this:\n" +
        '<script>\n' +
        "window.angularTranslationLanguages = ['en', ...];\n" +
        '</script>\n' +
        '<script src="http://yoav-zibin.github.io/emulator/angular-translate/angular-translate.min.js"></script>\n');
  }
  var $availableLanguageKeys = window.angularTranslationLanguages;

  // tries to determine the browsers language
  function getFirstBrowserLanguage() {
    var nav = window.navigator,
        browserLanguagePropertyKeys = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'],
        i,
        language;

    // support for HTML 5.1 "navigator.languages"
    if (angular.isArray(nav.languages)) {
      for (i = 0; i < nav.languages.length; i++) {
        language = nav.languages[i];
        if (language && language.length) {
          return language;
        }
      }
    }

    // support for other well known properties in browsers
    for (i = 0; i < browserLanguagePropertyKeys.length; i++) {
      language = nav[browserLanguagePropertyKeys[i]];
      if (language && language.length) {
        return language;
      }
    }

    return null;
  }

  // tries to determine the browsers locale
  function getLocale() {
    return (getFirstBrowserLanguage() || '').split('-').join('_');
  }

  /**
   * @name indexOf
   * @private
   *
   * @description
   * indexOf polyfill. Kinda sorta.
   *
   * @param {array} array Array to search in.
   * @param {string} searchElement Element to search for.
   *
   * @returns {int} Index of search element.
   */
  function indexOf(array, searchElement) {
    for (var i = 0, len = array.length; i < len; i++) {
      if (array[i] === searchElement) {
        return i;
      }
    }
    return -1;
  }

  function negotiateLocale(preferred) {

    var avail = [],
        locale = angular.lowercase(preferred),
        i = 0,
        n = $availableLanguageKeys.length;

    for (; i < n; i++) {
      avail.push(angular.lowercase($availableLanguageKeys[i]));
    }

    if (indexOf(avail, locale) > -1) {
      return preferred;
    }

    var parts = preferred.split('_');

    if (parts.length > 1 && indexOf(avail, angular.lowercase(parts[0])) > -1) {
      return parts[0];
    }

    // If everything fails, just return the preferred, unchanged.
    return $availableLanguageKeys[0];
  }

  var urlParams = function () {
    var query = location.search.substr(1);
    var result = {};
    query.split("&").forEach(function(part) {
      var item = part.split("=");
      result[item[0]] = decodeURIComponent(item[1]);
    });
    return result;
  } ();

  function getLanguage() {
    var locale = urlParams.lang ? urlParams.lang : getLocale();

    var language = negotiateLocale(locale);
    if ($availableLanguageKeys.indexOf(language) === -1) {
      throw new Error("YOAV: the selected language (" + language + ") must be in $availableLanguageKeys=" + $availableLanguageKeys);
    }
    return language;
  }

  var language = getLanguage();
  console.log("Language is " + language);
  window.angularLanguage = language;
  var script = "<script src='languages/" + language + ".js'></script>";
  document.write(script); // jshint ignore:line
})();

angular.module('myApp')
.factory('$translate', ['$interpolate', function ($interpolate) {
  'use strict';

  var angularTranslations = window.angularTranslations;
  var language = window.angularLanguage;
  if (!language) {
    throw new Error("Missing window.angularLanguage");
  }
  if (angularTranslations) {
    // store in local storage (for offline usage)
    if (window.localStorage) {
      console.log("Storing translations for " + language);
      window.localStorage.setItem(language, angular.toJson(angularTranslations));
    }
  }

  function loadFromLocalStorage(lang) {
    if (!angularTranslations) {
      if (window.localStorage) {
        var str = window.localStorage.getItem(lang);
        if (str) {
          angularTranslations = angular.fromJson(str);
          language = lang;
          console.log("Loaded translations from localStorage for " + lang);
        }
      }
    }
  }
  loadFromLocalStorage(language);
  if (!angularTranslations) {
    // try any other language in local storage
    var allLanguages = window.angularTranslationLanguages;
    for (var i = 0; i < allLanguages.length; i++) {
      loadFromLocalStorage(allLanguages[i]);
    }
  }
  if (!angularTranslations) {
    throw new Error("Couldn't load language=" + language + " neither from the internet nor from localStorage");
  }

  function translate(translationId, interpolateParams) {
    var translation = angularTranslations[translationId];
    if (!translation) {
      throw new Error("Couldn't find translationId=" + translationId + " in language=" + language);
    }
    return $interpolate(translation)(interpolateParams || {});
  }
  window.$translate = translate; // for debugging
  translate.getLanguage = function () { return language; };
  return translate;
}])
.filter('translate', ['$parse', '$translate', function ($parse, $translate) {
  'use strict';

  return function (translationId, interpolateParams) {
    if (!angular.isObject(interpolateParams)) {
      interpolateParams = $parse(interpolateParams)(this);
    }
    return $translate(translationId, interpolateParams);
  };
}]);
