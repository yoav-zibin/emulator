// This can't be a module, because we use it like:  translate(...) and not like translate.foobar(...)
function createTranslateService() {
    if (!angular) {
        throw new Error('You must first include angular: <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
    }
    if (!angular.isArray(window.angularTranslationLanguages)) {
        log.info("You didn't set window.angularTranslationLanguages, so you can't use I18N.");
        // you don't have to use I18N :)
        return null;
    }
    var $availableLanguageKeys = window.angularTranslationLanguages;
    // tries to determine the browsers language
    function getFirstBrowserLanguage() {
        var nav = window.navigator, browserLanguagePropertyKeys = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'], i, language;
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
        var avail = [], locale = angular.lowercase(preferred), i = 0, n = $availableLanguageKeys.length;
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
    function getLanguage() {
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
    log.log("Language is " + language);
    var angularTranslations = myStorage.getItem(language);
    window.angularTranslationsLoaded = function (lang, codeToL10N) {
        log.log("languages/" + language + ".js finished loading, and it called angularTranslationsLoaded with language=" + lang);
        angularTranslations = codeToL10N;
        myStorage.setItem(language, angularTranslations);
    };
    // Do not add "crossorigin='anonymous'" because it will prevent local testing.
    var script = "<script src='languages/" + language + ".js'></script>"; // It will block, thus preventing angular to start before the translations are loaded.
    document.write(script); // jshint ignore:line
    function translate(translationId, interpolateParams) {
        if (!angularTranslations) {
            throw new Error("Couldn't load language=" + language + " neither from the internet nor from localStorage");
        }
        var translation = angularTranslations[translationId];
        if (!translation) {
            throw new Error("Couldn't find translationId=" + translationId + " in language=" + language);
        }
        return $interpolate(translation)(interpolateParams || {});
    }
    var translateService;
    translateService = translate;
    translateService.getLanguage = function () { return language; };
    return translateService;
}
var translate = createTranslateService(); // uses urlParams.lang
angular.module('myApp')
    .filter('translate', ['$parse', function ($parse) {
        'use strict';
        return function (translationId, interpolateParams) {
            if (!angular.isObject(interpolateParams)) {
                interpolateParams = $parse(interpolateParams)(this);
            }
            return translate(translationId, interpolateParams);
        };
    }]);
