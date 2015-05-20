var emulatorServicesCompilationDate = "Wed May 20 15:09:27 EDT 2015";
;angular.module('myApp')
.service('realTimeSimpleService',
  ["$window", "$log", "$timeout", "messageService", "randomService",
    function($window, $log, $timeout, messageService, randomService) {
  'use strict';

  /* API summary:
  realTimeSimpleService.init(game)
  game.gotStartMatch({playersInfo, yourPlayerIndex})
  game.gotMessage({fromPlayerIndex, message});
  game.gotEndMatch(endMatchScores)
  realTimeSimpleService.sendReliableMessage(‘only strings’)
  realTimeSimpleService.sendUnreliableMessage(‘only strings’)
  realTimeSimpleService.endMatch(endMatchScores)
  */
  var isLocalTesting = $window.parent === $window;
  var game;
  var playersInfo = null; // This is not null iff there is an ongoing game.

  function sendLocalTestingStartMatch() {
    $timeout(function () {
      $log.info("Sending gotStartMatch");
      handleMessage({
        gotStartMatch: {
          playersInfo: [{playerId: 42}],
          // No yourPlayerIndex because we want isSingleDevice.
          randomSeed: "someRandomSeed" + randomService.doNotUseInYourGameGetOriginalMathRandom()
        }
      });
    }, 500);
  }

  function init(_game) {
    if (!_game || !_game.gotStartMatch ||
        !_game.gotMessage || !_game.gotEndMatch) {
      throw new Error("You must pass a game to init(game) " +
          "with the methods: gotStartMatch, gotMessage, and gotEndMatch.");
    }
    if (game) {
      throw new Error("You can call realTimeSimpleService.init(game) exactly once!");
    }
    game = _game;
    if (isLocalTesting) {
      sendLocalTestingStartMatch();
    } else {
      messageService.addMessageListener(handleMessage);
      messageService.sendMessage({gameReady: true});
    }
  }

  function sendMessage(msg) {
    if (isLocalTesting) {
      if (msg.endMatch) {
        sendLocalTestingStartMatch();
      } else {
        // sendReliableMessage or sendUnreliableMessage
        throw new Error("Shouldn't send messages in local testing");
      }
    } else {
      messageService.sendMessage(msg);
    }
  }

  function handleMessage(message) {
    $window.lastMessage = message;
    if (message.gotStartMatch) {
      if (playersInfo) {
        game.gotEndMatch(null);
      }
      playersInfo = message.gotStartMatch.playersInfo;
      if (playersInfo.length === 1) {
        message.gotStartMatch.yourPlayerIndex = 0;
      } else {
        if (message.gotStartMatch.yourPlayerIndex === undefined) {
          throw new Error("Can't do single-device multiplayer using realTimeSimpleService!");
        }
      }
      randomService.setSeed(message.gotStartMatch.randomSeed);
      game.gotStartMatch(message.gotStartMatch);
    } else if (message.gotMessage) {
      if (!playersInfo) {
        return;
      }
      game.gotMessage(message.gotMessage);
    } else if (message.gotEndMatch !== undefined) { // can be null
      if (!playersInfo) {
        return;
      }
      playersInfo = null;
      game.gotEndMatch(message.gotEndMatch);
    } else {
      throw new Error("Unknown message: " + angular.toJson(message));
    }
  }

  function checkSendMessage(msg) {
    if (!msg || typeof msg !== "string") {
      throw new Error("When calling realTimeService.sendReliableMessage(message), " +
          "you must pass a non-empty string as the message.");
    }
    if (msg.length >= 1000) {
      console.log("CAREFUL: Maximum message length is 1000, but you passed a message of length " +
          msg.length +
          ". The platform will try to zip the message, but if it is still big then the match will be ended in a tie");
    }
    if (!playersInfo) {
      throw new Error("You must not send a message before getting game.startMatch");
    }
  }

  function sendReliableMessage(msg) {
    checkSendMessage(msg);
    if (playersInfo.length === 1) {
      return;
    }
    sendMessage({sendReliableMessage: msg});
  }

  function sendUnreliableMessage(msg) {
    checkSendMessage(msg);
    if (playersInfo.length === 1) {
      return;
    }
    sendMessage({sendUnreliableMessage: msg});
  }

  function endMatch(endMatchScores) {
    if (!playersInfo) {
      throw new Error("You must not call realTimeService.endMatch(endMatchScores) before getting game.gotStartMatch");
    }
    if (!endMatchScores || endMatchScores.length !== playersInfo.length) {
      throw new Error("When calling realTimeService.endMatch(endMatchScores), " +
          "you must pass an array of the same length as the number of players in gotStartMatch.");
    }
    game.gotEndMatch(endMatchScores);
    playersInfo = null;
    sendMessage({endMatch: endMatchScores});
  }

  this.init = init;
  this.sendReliableMessage = sendReliableMessage;
  this.sendUnreliableMessage = sendUnreliableMessage;
  this.endMatch = endMatch;
}]);
;angular.module('myApp')
  .service('messageService',
      ["$window", "logSaver", "$rootScope",
        function($window, logSaver, $rootScope) {

    'use strict';

    var gameUrl = location.toString();
    this.sendMessage = function (message) {
      logSaver.info("Game sent message", message);
      message.gameUrl = gameUrl;
      $window.parent.postMessage(message, "*");
    };
    this.addMessageListener = function (listener) {
      $window.addEventListener("message", function (event) {
        var source = event.source;
        if (source !== $window.parent) {
          return;
        }
        var message = event.data;
        logSaver.info("Game got message", message);
        $rootScope.$apply(function () {
          listener(message);
        });
      }, false);
    };
  }])
  .factory('$exceptionHandler',
      ["$window", "logSaver",
        function ($window, logSaver) {

    'use strict';

    function angularErrorHandler(exception, cause) {
      var lines = [];
      lines.push("Game URL: " + $window.location);
      lines.push("exception: " + exception);
      lines.push("stackTrace: " + (exception && exception.stack ? exception.stack.replace(/\n/g,"\n\t") : "no stack trace :("));
      lines.push("cause: " + cause);
      lines.push("Game logs: " + logSaver.getLogs().replace(/\n/g,"\n\t"));
      var errStr = lines.join("\n\t");
      console.error("Game had an exception:\n", errStr);
      $window.parent.postMessage({emailJavaScriptError: errStr}, "*");
    }

    window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
      angularErrorHandler(errorObj,
          'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
          ' Column: ' + column);
    };

    return angularErrorHandler;
  }]);
;angular.module('myApp')
.service('logSaver', function () {
  'use strict';

  function getCurrentTime() {
    return window.performance ? window.performance.now() : new Date().getTime();
  }

  var alwaysLogs = [];
  var lastLogs = [];
  var startTime = getCurrentTime();

  function getLogEntry(args) {
    return {time: getCurrentTime() - startTime, args: args};
  }

  function storeLog(args) {
    if (lastLogs.length > 100) {
      lastLogs.shift();
    }
    lastLogs.push(getLogEntry(args));
  }

  function convertLogEntriesToStrings(logs, lines) {
    // In reverse order (in case the email gets truncated)
    for (var i = logs.length - 1; i >= 0; i--) {
      var entry = logs[i];
      var stringArgs = [];
      for (var j = 0; j < entry.args.length; j++) {
        var arg = entry.args[j];
        var stringArg = "" + arg;
        if (stringArg === "[object Object]") {
          stringArg = angular.toJson(arg);
        }
        stringArgs.push(stringArg);
      }
      lines.push("Time " + (entry.time / 1000).toFixed(3) + ": " + stringArgs.join(","));
    }
  }

  function getLogs() {
    var lines = [];
    lines.push("Always-logs:\n");
    convertLogEntriesToStrings(alwaysLogs, lines);
    lines.push("\n\nRecent-logs:\n");
    convertLogEntriesToStrings(lastLogs, lines);
    return lines.join('\n');
  }

  function alwaysLog() {
    alwaysLogs.push(getLogEntry(arguments));
    console.info.apply(console, arguments);
  }

  function info() {
    storeLog(arguments);
    console.info.apply(console, arguments);
  }

  function debug() {
    storeLog(arguments);
    console.debug.apply(console, arguments);
  }

  function warn() {
    storeLog(arguments);
    console.warn.apply(console, arguments);
  }

  function error() {
    storeLog(arguments);
    console.error.apply(console, arguments);
  }

  function log() {
    storeLog(arguments);
    console.log.apply(console, arguments);
  }

  alwaysLog("emulatorServicesCompilationDate=" + emulatorServicesCompilationDate);
  
  this.getCurrentTime = getCurrentTime;
  this.getLogs = getLogs;
  this.alwaysLog = alwaysLog;
  this.info = info;
  this.debug = debug;
  this.error = error;
  this.warn = warn;
  this.log = log;
});
;angular.module('myApp')
.service('randomService', function () {
  'use strict';

  if (!Math.seedrandom) {
    throw new Error("You forgot to include in your HTML: <script src='http://cdnjs.cloudflare.com/ajax/libs/seedrandom/2.3.11/seedrandom.min.js'></script>");
  }
  var originalRandom = Math.random;
  var seededRandom = null;
  var randomValues = null;
  var seed = null;

  this.setSeed = function (_seed) {
    seed = _seed;
    randomValues = [];
    Math.seedrandom(seed);
    seededRandom = Math.random;
    Math.random = function () {
      throw new Error("Do NOT use Math.random(); Instead, use randomService.random(randomIndex)");
    };
  };

  function checkRandomIndex(randomIndex) {
    if (randomIndex === undefined) {
      throw new Error("You forgot to pass randomIndex when calling randomService method, e.g., you should call randomService.random(42); randomIndex should be an index of a random number. In a specific match, calling randomService.random(42) multiple times will return the same random number.");
    }
  }

  this.random = function (randomIndex) {
    checkRandomIndex(randomIndex);
    for (var i = randomValues.length; i <= randomIndex; i++) {
      randomValues[i] = seededRandom();
    }
    return randomValues[randomIndex];
  };

  this.randomFromTo = function (randomIndex, from, to) {
    checkRandomIndex(randomIndex);
    if (from === undefined || to === undefined || from >= to) {
      throw new Error("In randomService.randomFromTo(randomIndex, from,to), you must have from<to, but from=" + from + " to=" + to);
    }
    return Math.floor(this.random(randomIndex) * (to - from) + from);
  };

  this.doNotUseInYourGameGetOriginalMathRandom = function () { return originalRandom(); };

  this.setSeed(0);
});
;angular.module('myApp')
  .service('resizeGameAreaService',
    ['$window', '$log',
      function($window, $log) {

    'use strict';

    var widthToHeight = null;
    var oldSizes = null;
    var doc = $window.document;
    var gameArea;

    function setWidthToHeight(_widthToHeight) {
      widthToHeight = _widthToHeight;
      gameArea = doc.getElementById('gameArea');
      if (!gameArea) {
        throw new Error("You forgot to add to your <body> this div: <div id='gameArea'>...</div>");
      }
      oldSizes = null;
      rescale();
    }

    function round2(num) {
      return Math.round(num * 100) / 100;
    }

    function rescale() {
      if (widthToHeight === null) {
        return;
      }
      var originalWindowWidth = $window.innerWidth; // doc.body.clientWidth
      var originalWindowHeight = $window.innerHeight; // I saw cases where doc.body.clientHeight was 0.
      var windowWidth = originalWindowWidth;
      var windowHeight = originalWindowHeight;
      if (oldSizes !== null) {
        if (oldSizes.windowWidth === windowWidth &&
            oldSizes.windowHeight === windowHeight) {
          return; // nothing changed, so no need to change the transformations.
        }
      }
      oldSizes = {
          windowWidth: windowWidth,
          windowHeight: windowHeight
      };

      if (windowWidth === 0 || windowHeight === 0) {
        $log.info("Window width/height is 0 so hiding gameArea div.");
        gameArea.style.display = "none";
        return;
      }
      gameArea.style.display = "block";

      var newWidthToHeight = windowWidth / windowHeight;

      if (newWidthToHeight > widthToHeight) {
        windowWidth = round2(windowHeight * widthToHeight);
      } else {
        windowHeight = round2(windowWidth / widthToHeight);
      }
      $log.info("Window size is " + oldSizes.windowWidth + "x" + oldSizes.windowHeight +
          " so setting gameArea size to " + windowWidth + "x" + windowHeight +
          " because widthToHeight=" + widthToHeight);

      // Take 5% margin (so the game won't touch the end of the screen)
      var keepMargin = 0.95;
      windowWidth *= keepMargin;
      windowHeight *= keepMargin;
      gameArea.style.width = windowWidth + 'px';
      gameArea.style.height = windowHeight + 'px';
      gameArea.style.position = "absolute";
      gameArea.style.left = ((originalWindowWidth - windowWidth)/2) + 'px';
      gameArea.style.top = ((originalWindowHeight - windowHeight)/2) + 'px';
    }

    $window.onresize = rescale;
    $window.onorientationchange = rescale;
    doc.addEventListener("onresize", rescale);
    doc.addEventListener("orientationchange", rescale);
    setInterval(rescale, 1000);

    this.setWidthToHeight = setWidthToHeight;
  }]);
;(function () {
  'use strict';

  if (!angular) {
    throw new Error('You must first include angular: <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
  }
  if (!angular.isArray(window.angularTranslationLanguages)) {
    return; // you don't have to use I18N :)
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
  window.angularTranslationsLoaded = function (lang, codeToL10N) {
    console.log("angularTranslationsLoaded called with language=" + lang);
    window.angularTranslations = codeToL10N;
  };
  // Do not add "crossorigin='anonymous'" because it will prevent local testing.
  var script = "<script src='languages/" + language + ".js'></script>"; // It will block, thus preventing angular to start before the translations are loaded.
  document.write(script); // jshint ignore:line
})();

angular.module('myApp')
.factory('$translate', ['$interpolate', 'logSaver', function ($interpolate, logSaver) {
  'use strict';

  var angularTranslations = window.angularTranslations;
  var language = window.angularLanguage;
  if (!language) {
    throw new Error("You must include angularTranslate like this:\n" +
        '<script>\n' +
        "window.angularTranslationLanguages = ['en', ...];\n" +
        '</script>\n' +
        '<script src="http://yoav-zibin.github.io/emulator/angular-translate/angular-translate.min.js"></script>\n');
  }
  if (angularTranslations) {
    // store in local storage (for offline usage)
    if (window.localStorage) {
      logSaver.alwaysLog("Storing translations for " + language);
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
          logSaver.alwaysLog("Loaded translations from localStorage for " + lang);
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
;// You use dragAndDropService like this:
// dragAndDropService.addDragListener(touchElementId, function handleDragEvent(type, clientX, clientY, event) {...});
// touchElementId can be "gameArea" (or any other element id).
// type is either: "touchstart", "touchmove", "touchend", "touchcancel", "touchleave"
angular.module('myApp')
.factory('dragAndDropService', ['$log', function ($log) {
  'use strict';

  function addDragListener(touchElementId, handleDragEvent) {
    if (!touchElementId || !handleDragEvent) {
      throw new Error("When calling addDragListener(touchElementId, handleDragEvent), you must pass two parameters");
    }

    var isMouseDown = false;

    function touchHandler(event) {
      var touch = event.changedTouches[0];
      handleEvent(event, event.type, touch.clientX, touch.clientY);
    }

    function mouseDownHandler(event) {
      isMouseDown = true;
      handleEvent(event, "touchstart", event.clientX, event.clientY);
    }

    function mouseMoveHandler(event) {
      if (isMouseDown) {
        handleEvent(event, "touchmove", event.clientX, event.clientY);
      }
    }

    function mouseUpHandler(event) {
      isMouseDown = false;
      handleEvent(event, "touchend", event.clientX, event.clientY);
    }

    function handleEvent(event, type, clientX, clientY) {
      // http://stackoverflow.com/questions/3413683/disabling-the-context-menu-on-long-taps-on-android
      // I also have:  touch-callout:none and user-select:none in main.css
      if (event.preventDefault) {
        event.preventDefault(); // Also prevents generating mouse events for touch.
      }
      if (event.stopPropagation) {
        event.stopPropagation();
      }
      event.cancelBubble = true;
      event.returnValue = false;
      $log.debug("handleDragEvent:", type, clientX, clientY);
      handleDragEvent(type, clientX, clientY, event);
    }

    var gameArea = document.getElementById(touchElementId);
    if (!gameArea) {
      throw new Error("You must have <div id='" + touchElementId + "'>...</div>");
    }
    gameArea.addEventListener("touchstart", touchHandler, true);
    gameArea.addEventListener("touchmove", touchHandler, true);
    gameArea.addEventListener("touchend", touchHandler, true);
    gameArea.addEventListener("touchcancel", touchHandler, true);
    gameArea.addEventListener("touchleave", touchHandler, true);
    gameArea.addEventListener("mousedown", mouseDownHandler, true);
    gameArea.addEventListener("mousemove", mouseMoveHandler, true);
    gameArea.addEventListener("mouseup", mouseUpHandler, true);
  }

  return {addDragListener: addDragListener};
}]);
