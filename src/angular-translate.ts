namespace gamingPlatform {

export interface StringToStringDictionary {
  [index: string]: StringDictionary;
}

// Defines translate service and filter for I18N.
export interface TranslateService {
  (translationId: string, interpolateParams?: StringDictionary, languageCode?: string): string;
  getLanguage(): string;
  setTranslations(idToLanguageToL10n: StringToStringDictionary): void;
  setLanguage(language: string, codeToL10N?: StringDictionary): void;
}

// This can't be a module, because we use it like:  translate(...) and not like translate.foobar(...)
function createTranslateService(): TranslateService {
  let language: string;
  // codeToL10N is deprecated (I keep it for older games that used the platform for i18n)
  // New games should use setTranslations (which sets idToLanguageToL10n).
  let codeToL10N: StringDictionary = null;
  let idToLanguageToL10n: StringToStringDictionary = null;

  function translate(translationId: string, interpolateParams: StringDictionary, languageCode?: string): string {
    if (!languageCode) languageCode = language;
    let translation: string = null;
    if (idToLanguageToL10n && idToLanguageToL10n[translationId]) {
      let languageToL10n = idToLanguageToL10n[translationId];
      translation = languageToL10n[languageCode];
      if (!translation) translation = languageToL10n['en']; 
    } else if (codeToL10N) {
      translation = codeToL10N[translationId];
    }
    if (!translation) {
      translation = "[" + translationId + "]";
      log.error("Couldn't find translationId=" + translationId + " in language=" + languageCode);
    }
    return $interpolate(translation)(interpolateParams || {});
  }
  let translateService: TranslateService;
  translateService = <TranslateService>translate;
  translateService.getLanguage = function (): string { return language; };
  translateService.setTranslations = function (_idToLanguageToL10n: StringToStringDictionary): void {
    idToLanguageToL10n = _idToLanguageToL10n;
  };
  translateService.setLanguage = function (_language: string, _codeToL10N?: StringDictionary): void {
    language = _language;
    codeToL10N = _codeToL10N;
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
