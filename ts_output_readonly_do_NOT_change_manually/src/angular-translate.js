var gamingPlatform;
(function (gamingPlatform) {
    // This can't be a module, because we use it like:  translate(...) and not like translate.foobar(...)
    function createTranslateService() {
        var language;
        // codeToL10N is deprecated (I keep it for older games that used the platform for i18n)
        // New games should use setTranslations (which sets idToLanguageToL10n).
        var codeToL10N = null;
        var idToLanguageToL10n = null;
        function translate(translationId, interpolateParams, languageCode) {
            if (!languageCode)
                languageCode = language;
            var translation = idToLanguageToL10n ? idToLanguageToL10n[translationId][languageCode] : codeToL10N[translationId];
            if (!translation) {
                translation = "[" + translationId + "]";
                gamingPlatform.log.error("Couldn't find translationId=" + translationId + " in language=" + languageCode);
            }
            return gamingPlatform.$interpolate(translation)(interpolateParams || {});
        }
        var translateService;
        translateService = translate;
        translateService.getLanguage = function () { return language; };
        translateService.setTranslations = function (_idToLanguageToL10n) {
            idToLanguageToL10n = _idToLanguageToL10n;
        };
        translateService.setLanguage = function (_language, _codeToL10N) {
            language = _language;
            codeToL10N = _codeToL10N;
        };
        return translateService;
    }
    gamingPlatform.translate = createTranslateService();
    gamingPlatform.defaultTranslateInterpolateParams = {};
    angular.module('translate', [])
        .filter('translate', ['$parse', function ($parse) {
            var translateFilter = function (translationId, interpolateParams) {
                if (!angular.isObject(interpolateParams)) {
                    interpolateParams = $parse(interpolateParams)(this);
                }
                if (!interpolateParams)
                    interpolateParams = gamingPlatform.defaultTranslateInterpolateParams;
                return gamingPlatform.translate(translationId, interpolateParams);
            };
            translateFilter.$stateful = true;
            return translateFilter;
        }]);
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=angular-translate.js.map