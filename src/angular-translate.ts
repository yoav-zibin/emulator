namespace gamingPlatform {

export interface StringToStringDictionary {
  [index: string]: StringDictionary;
}

// Defines translate service and filter for I18N.
export interface TranslateService {
  (translationId: string, interpolateParams?: StringDictionary): string;
  getLanguage(): string;
  setTranslations(idToLanguageToL10n: StringToStringDictionary): void;
  setLanguage(language: string, codeToL10N?: StringDictionary): void;
}

// This can't be a module, because we use it like:  translate(...) and not like translate.foobar(...)
function createTranslateService(): TranslateService {
  if (!angular) {
    throw new Error('You must first include angular: <script crossorigin="anonymous" src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
  }

  let language: string;
  let codeToL10N: StringDictionary;
  let idToLanguageToL10n: StringToStringDictionary = null;

  function translate(translationId: string, interpolateParams: StringDictionary): string {
    if (!codeToL10N) {
      throw new Error("You must call translate.setLanguage(lang: string, codeToL10N: StringDictionary) before requesting translation of translationId=" + translationId);
    }
    let translation = codeToL10N[translationId];
    if (!translation) {
      translation = "[" + translationId + "]";
      log.error("Couldn't find translationId=" + translationId + " in language=" + language);
    }
    return $interpolate(translation)(interpolateParams || {});
  }
  let translateService: TranslateService;
  translateService = <TranslateService>translate;
  translateService.getLanguage = function (): string { return language; };
  translateService.setTranslations = function (_idToLanguageToL10n: StringToStringDictionary): void {
    idToLanguageToL10n = _idToLanguageToL10n;
  };
  translateService.setLanguage = function (_language: string, _codeToL10N: StringDictionary): void {
    language = _language;
    if (!idToLanguageToL10n) {
      codeToL10N = _codeToL10N;
    } else {
      codeToL10N = {};
      for (let id in idToLanguageToL10n) {
        codeToL10N[id] = idToLanguageToL10n[id][language];
      }
    }
  };
  return translateService;
}

export let translate = createTranslateService();
export let defaultTranslateInterpolateParams: StringDictionary = {};

angular.module('translate', [])
.filter('translate', ['$parse', function ($parse:angular.IParseService) {
  let translateFilter: any =  function (translationId: string, interpolateParams: StringDictionary|string): string {
    if (!angular.isObject(interpolateParams)) {
      interpolateParams = $parse(<string>interpolateParams)(this);
    }
    if (!interpolateParams) interpolateParams = defaultTranslateInterpolateParams;
    return translate(translationId, <StringDictionary>interpolateParams);
  };
  translateFilter.$stateful = true;
  return translateFilter;
}]);

}
