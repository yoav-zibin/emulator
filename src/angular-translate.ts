// Defines $translate service and filter for I18N.
interface TranslateService {
  (translationId: string, interpolateParams?: StringDictionary): string;
  getLanguage(): string;
}
interface StringDictionary {
  [index: string]: string;
}
interface StringNumberDictionary {
  [index: string]: (string|number);
}
interface Window {
  angularTranslationLanguages: string[];
  angularTranslationsLoaded: (lang: string, codeToL10N: StringDictionary) => void;
}
interface Navigator {
  languages: string[];
}

// This can't be a module, because we use it like:  $translate(...) and not like $translate.foobar(...)
function createTranslateService(): TranslateService {
  if (!angular) {
    throw new Error('You must first include angular: <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
  }
  if (!angular.isArray(window.angularTranslationLanguages)) {
    return null; // you don't have to use I18N :)
  }
  var $availableLanguageKeys = window.angularTranslationLanguages;

  // tries to determine the browsers language
  function getFirstBrowserLanguage(): string {
    var nav = window.navigator,
        browserLanguagePropertyKeys = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'],
        i: number,
        language: string;

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
  function getLocale(): string {
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
  function indexOf(array: string[], searchElement: string): number {
    for (var i = 0, len = array.length; i < len; i++) {
      if (array[i] === searchElement) {
        return i;
      }
    }
    return -1;
  }

  function negotiateLocale(preferred: string): string {

    var avail: string[] = [],
        locale: string = angular.lowercase(preferred),
        i = 0,
        n = $availableLanguageKeys.length;

    for (; i < n; i++) {
      avail.push(angular.lowercase($availableLanguageKeys[i]));
    }

    if (indexOf(avail, locale) > -1) {
      return preferred;
    }

    var parts: string[] = preferred.split('_');

    if (parts.length > 1 && indexOf(avail, angular.lowercase(parts[0])) > -1) {
      return parts[0];
    }

    // If everything fails, just return the preferred, unchanged.
    return $availableLanguageKeys[0];
  }

  function getLanguage(): string {
    var lang = urlParams.lang;
    var locale = lang ? lang : getLocale();

    var language = negotiateLocale(locale);
    if ($availableLanguageKeys.indexOf(language) === -1) {
      throw new Error("YOAV: the selected language (" + language + ") must be in $availableLanguageKeys=" + $availableLanguageKeys);
    }
    return language;
  }

  var language = getLanguage();
  if (!language) {
    throw new Error("You must include angularTranslate like this:\n" +
        '<script>\n' +
        "window.angularTranslationLanguages = ['en', ...];\n" +
        '</script>\n' +
        '<script src="http://yoav-zibin.github.io/emulator/angular-translate/angular-translate.min.js"></script>\n');
  }
  console.log("Language is " + language);
  var angularTranslations: StringDictionary = myStorage.getItem(language);
  window.angularTranslationsLoaded = function (lang: string, codeToL10N: StringDictionary): void {
    console.log("angularTranslationsLoaded called with language=" + lang);
    angularTranslations = codeToL10N;
    myStorage.setItem(language, angularTranslations);
  };
  // Do not add "crossorigin='anonymous'" because it will prevent local testing.
  var script = "<script src='languages/" + language + ".js'></script>"; // It will block, thus preventing angular to start before the translations are loaded.
  document.write(script); // jshint ignore:line

  function translate(translationId: string, interpolateParams: StringDictionary): string {
    if (!angularTranslations) {
      throw new Error("Couldn't load language=" + language + " neither from the internet nor from localStorage");
    }
    var translation = angularTranslations[translationId];
    if (!translation) {
      throw new Error("Couldn't find translationId=" + translationId + " in language=" + language);
    }
    return $interpolate(translation)(interpolateParams || {});
  }
  var translateService: TranslateService;
  translateService = <TranslateService>translate;
  translateService.getLanguage = function (): string { return language; };
  return translateService;
}

var $translate = createTranslateService(); // uses urlParams.lang

angular.module('myApp')
.filter('translate', ['$parse', function ($parse:angular.IParseService) {
  'use strict';

  return function (translationId: string, interpolateParams: StringDictionary|string): string {
    if (!angular.isObject(interpolateParams)) {
      interpolateParams = $parse(<string>interpolateParams)(this);
    }
    return $translate(translationId, <StringDictionary>interpolateParams);
  };
}]);
