var gamingPlatform;
(function (gamingPlatform) {
    // This can't be a module, because we use it like:  translate(...) and not like translate.foobar(...)
    function createTranslateService() {
        if (!angular) {
            throw new Error('You must first include angular: <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
        }
        var language;
        var codeToL10N;
        function translate(translationId, interpolateParams) {
            if (!codeToL10N) {
                throw new Error("You must call translate.setLanguagelang: string, codeToL10N: StringDictionary) before requesting translation of translationId=" + translationId);
            }
            var translation = codeToL10N[translationId];
            if (!translation) {
                translation = "[" + translationId + "]";
                gamingPlatform.log.error("Couldn't find translationId=" + translationId + " in language=" + language);
            }
            return $interpolate(translation)(interpolateParams || {});
        }
        var translateService;
        translateService = translate;
        translateService.getLanguage = function () { return language; };
        translateService.setLanguage = function (_language, _codeToL10N) {
            language = _language;
            codeToL10N = _codeToL10N;
        };
        return translateService;
    }
    gamingPlatform.translate = createTranslateService();
    angular.module('translate', [])
        .filter('translate', ['$parse', function ($parse) {
            var translateFilter = function (translationId, interpolateParams) {
                if (!angular.isObject(interpolateParams)) {
                    interpolateParams = $parse(interpolateParams)(this);
                }
                return gamingPlatform.translate(translationId, interpolateParams);
            };
            translateFilter.$stateful = true;
            return translateFilter;
        }]);
})(gamingPlatform || (gamingPlatform = {}));
