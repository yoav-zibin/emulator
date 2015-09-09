// Defines translate service and filter for I18N.
interface TranslateService {
  (translationId: string, interpolateParams?: StringDictionary): string;
  getLanguage(): string;
  setLanguage(lang: string, codeToL10N: StringDictionary): void;
}
interface StringDictionary {
  [index: string]: string;
}

// This can't be a module, because we use it like:  translate(...) and not like translate.foobar(...)
function createTranslateService(): TranslateService {
  if (!angular) {
    throw new Error('You must first include angular: <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
  }

  var language: string;
  var codeToL10N: StringDictionary;

  function translate(translationId: string, interpolateParams: StringDictionary): string {
    if (!codeToL10N) {
      throw new Error("You must call translate.setLanguagelang: string, codeToL10N: StringDictionary) before requesting translation of translationId=" + translationId);
    }
    var translation = codeToL10N[translationId];
    if (!translation) {
      throw new Error("Couldn't find translationId=" + translationId + " in language=" + language);
    }
    return $interpolate(translation)(interpolateParams || {});
  }
  var translateService: TranslateService;
  translateService = <TranslateService>translate;
  translateService.getLanguage = function (): string { return language; };
  translateService.setLanguage = function (_language: string, _codeToL10N: StringDictionary): void {
    language = _language;
    codeToL10N = _codeToL10N;
  };
  return translateService;
}

var translate = createTranslateService();

angular.module('myApp')
.filter('translate', ['$parse', function ($parse:angular.IParseService) {
  'use strict';

  return function (translationId: string, interpolateParams: StringDictionary|string): string {
    if (!angular.isObject(interpolateParams)) {
      interpolateParams = $parse(<string>interpolateParams)(this);
    }
    return translate(translationId, <StringDictionary>interpolateParams);
  };
}]);
