namespace gamingPlatform {

export interface StringToStringDictionary {
  [index: string]: StringDictionary;
}

// This can't be a module, because we use it like:  translate(...) and not like translate.foobar(...)
function createTranslateService(): ITranslateService {
  let language: string;
  let idToLanguageToL10n: StringToStringDictionary = null;

  function translate(translationId: string, interpolateParams: StringDictionary, languageCode?: string): string {
    if (!languageCode) languageCode = language;
    let translation: string = null;
    if (idToLanguageToL10n && idToLanguageToL10n[translationId]) {
      let languageToL10n = idToLanguageToL10n[translationId];
      translation = languageToL10n[languageCode];
      if (!translation) translation = languageToL10n['en']; 
    }
    if (!translation) {
      translation = "[" + translationId + "]";
      log.error("Couldn't find translationId=" + translationId + " in language=" + languageCode);
    }
    let result = $interpolate(translation)(interpolateParams || {});
    if (result.indexOf('{{') !== -1) {
      log.error("You forgot to pass a translation parameter (interpolateParams) for translationId=" + translationId + " in language=" + languageCode + " which resulted in '" + result + "' (note that you forgot to pass some {{XXX}})");
    } 
    return result;
  }
  let translateService: ITranslateService;
  translateService = <ITranslateService>translate;
  translateService.getLanguage = function (): string { return language; };
  translateService.setTranslations = function (_idToLanguageToL10n: StringToStringDictionary): void {
    idToLanguageToL10n = _idToLanguageToL10n;
  };
  translateService.setLanguage = function (_language: string): void {
    language = _language;
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
