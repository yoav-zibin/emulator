angular.module('myApp')
.service('stateService',
    ["$window", "$timeout", "$log", "$rootScope",
      function($window, $timeout, $log, $rootScope) {

  'use strict';

  var game;

  var currentState;
  var lastState;
  var currentVisibleTo;
  var lastVisibleTo;
  var lastMove;
  var turnIndexBeforeMove;
  var turnIndex = 0; // turn after the move (-1 when the game ends)
  var endMatchScores = null;
  var setTurnOrEndMatchCount;
  var playersInfo;
  var playMode = location.search === "?onlyAIs" ? "onlyAIs"
      : location.search === "?playAgainstTheComputer" ? "playAgainstTheComputer" : "passAndPlay"; // Default play mode

  var randomSeed;
  var moveNumber;

  // Global settings
  $rootScope.settings = {};
  $rootScope.settings.simulateServerDelayMilliseconds = 0;

  function setPlayMode(_playMode) {
    playMode = _playMode;
    if (game !== undefined) {
      setPlayers();
      sendUpdateUi();
    }
  }

  function setRandomSeed(_randomSeed) {
    randomSeed = _randomSeed;
  }

  function setPlayers() {
    playersInfo = [];
    var actualNumberOfPlayers =
        randomFromTo(game.minNumberOfPlayers, game.maxNumberOfPlayers + 1);
    for (var i = 0; i < actualNumberOfPlayers; i++) {
      var playerId =
        playMode === "onlyAIs" ||
          i !== 0 && playMode === "playAgainstTheComputer" ?
          "" : // The playerId for the computer is "".
          "" + (i + 42);
      playersInfo.push({playerId : playerId});
    }
  }

  function init() {
    if (!game) {
      throwError("You must call setGame before any other method.");
    }
    setPlayers();
    currentState = {};
    lastState = null;
    currentVisibleTo = {};
    lastVisibleTo = null;
    lastMove = [];
    turnIndexBeforeMove = 0;
    turnIndex = 0; // can be -1 in the last updateUI after the game ended.
    endMatchScores = null;
    moveNumber = 0;
  }

  function startNewMatch() {
    init();
    broadcastUpdateUi();
  }

  //Function to get the keys from a JSON object
  function getKeys(object) {
    var keys = [];
    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  function clone(obj) {
    return angular.copy(obj);
  }

  function isNull(obj) {
    return obj === undefined || obj === null;
  }

  function throwError() {
    $log.error("Throwing an error with these arguments=", arguments);
    var msg = Array.prototype.join.call(arguments, ", ");
    throw new Error(msg);
  }

  function get(obj, field) {
    if (isNull(obj[field])) {
      throwError("You must have a field named '", field, "' in this object=", obj);
    }
    return obj[field];
  }

  function getMoveForPlayerIndex(playerIndex, move) {
    var moveForPlayer = [];
    for (var k = 0; k < move.length; k++) {
      var operation = move[k];
      if (!isNull(operation.set) &&
          !isNull(operation.set.visibleToPlayerIndexes) &&
          operation.set.visibleToPlayerIndexes.indexOf(playerIndex) === -1) {
        moveForPlayer.push({
          type : "Set",
          key : operation.set.key,
          value : null,
          visibleToPlayerIndexes : operation.set.visibleToPlayerIndexes
        });
      } else {
        moveForPlayer.push(operation);
      }
    }
    return moveForPlayer;
  }

  function getStateForPlayerIndex(playerIndex, gameState, visibleTo) {
    if (gameState === null) {
      return null;
    }
    var result = {};
    var keys = getKeys(gameState);
    for (var k = 0; k < keys.length; k++) {
      var visibleToPlayerIndexes = visibleTo[keys[k]];
      var value = null;
      if (isNull(visibleToPlayerIndexes) || visibleToPlayerIndexes.indexOf(playerIndex) > -1) {
        value = gameState[keys[k]];
      }
      result[keys[k]] = value;
    }
    return result;
  }

  function shuffle(keys) {
    var keysCopy = keys.slice(0);
    var result = [];
    while (keysCopy.length >= 1) {
      var index = randomFromTo(0, keysCopy.length);
      var removed = keysCopy.splice(index, 1);
      result.push(removed);
    }
    return result;
  }

  function randomFromTo(from, to) {
    if (isNull(from) || isNull(to) || from >= to) {
      throw new Error("In randomFromTo(from,to), you must have from<to, but from=" + from + " to=" + to);
    }
    return Math.floor(Math.random() * (to - from) + from);
  }

  function processApiOperation(operation) {
    //Check for all types of Operations
    var key;
    var op;
    var visibleToPlayerIndexes;
    if (!isNull(operation.set)) {
      op = operation.set;
      key = op.key;
      visibleToPlayerIndexes = op.visibleToPlayerIndexes;
      var value = op.value;
      if (isNull(key) || isNull(value)) {
        throwError("Fields key and value in Set operation must be non null. operation=" + angular.toJson(operation, true));
      }
      currentState[key] = value;
      currentVisibleTo[key] = visibleToPlayerIndexes;
    } else if (!isNull(operation.setTurn)) {
      op = operation.setTurn;
      turnIndex = get(op, "turnIndex");
      setTurnOrEndMatchCount++;
    } else if (!isNull(operation.setRandomInteger)) {
      op = operation.setRandomInteger;
      key = op.key;
      var from = op.from;
      var to = op.to;
      if (isNull(key) || isNull(from) || isNull(to)) {
        throwError("Fields key, from, and to, in SetRandomInteger operation must be non null. operation=" + angular.toJson(operation, true));
      }
      var randomValue = randomFromTo(from, to);
      currentState[key] = randomValue;
      currentVisibleTo[key] = null;
    } else if (!isNull(operation.setVisibility)) {
      op = operation.setVisibility;
      key = op.key;
      visibleToPlayerIndexes = op.visibleToPlayerIndexes;
      if (isNull(key)) {
        throwError("Fields key in SetVisibility operation must be non null. operation=" + angular.toJson(operation, true));
      }
      currentVisibleTo[key] = visibleToPlayerIndexes;
    } else if (!isNull(operation['delete'])) {
      op = operation['delete'];
      key = op.key;
      if (isNull(key)) {
        throwError("Field key in Delete operation must be non null. operation=" + angular.toJson(operation, true));
      }
      delete currentState[key];
      delete currentVisibleTo[key];
    } else if (!isNull(operation.shuffle)) {
      op = operation.shuffle;
      var keys = op.keys;
      if (isNull(keys) || keys.length === 0) {
        throwError("Field keys in Shuffle operation must be a non empty array. operation=" + angular.toJson(operation, true));
      }
      var shuffledKeys = shuffle(keys);
      var oldGameState = clone(currentState);
      var oldVisibleTo = clone(currentVisibleTo);
      for (var j = 0; j < shuffledKeys.length; j++) {
        var fromKey = keys[j];
        var toKey = shuffledKeys[j];
        currentState[toKey] = oldGameState[fromKey];
        currentVisibleTo[toKey] = oldVisibleTo[fromKey];
      }
    } else if (!isNull(operation.endMatch)) {
      op = operation.endMatch;
      setTurnOrEndMatchCount++;
      var scores = op.endMatchScores;
      if (isNull(scores) || scores.length !== playersInfo.length) {
        throwError("Field scores in EndMatch operation must be an array of the same length as the number of players. operation=" + angular.toJson(operation, true));
      }
      endMatchScores = scores;
      if (playMode === "onlyAIs") {
        $timeout(startNewMatch, 1000); // start a new match in 1 second.
      }
    } else {
      throwError("Illegal operation, it must contain either set, setRandomInteger, setVisibility, delete, shuffle, or endMatch: " + angular.toJson(operation, true));
    }
  }

  function getYourPlayerIndex() {
    return playMode === "playWhite" ? 0 :
          playMode === "playBlack" ? 1 :
          playMode === "playViewer" ? -2 : // viewer is -2 (because -1 for turnIndexAfterMove means the game ended)
          playMode === "playAgainstTheComputer" || playMode === "onlyAIs" ? turnIndex :
          playMode === "passAndPlay" ? turnIndex :
          playMode;
  }

  function getMatchState() {
    return {
      turnIndexBeforeMove: turnIndexBeforeMove,
      turnIndex: turnIndex,
      endMatchScores: endMatchScores,
      moveNumber: moveNumber,
      randomSeed: randomSeed,
      lastMove: lastMove,
      lastState: lastState,
      currentState: currentState,
      lastVisibleTo: lastVisibleTo,
      currentVisibleTo: currentVisibleTo
    };
  }

  function setMatchState(data) {
    if (data.turnIndexBeforeMove === undefined ||
        data.turnIndex === undefined ||
        data.endMatchScores === undefined) {
      return;
    }
    turnIndexBeforeMove = data.turnIndexBeforeMove;
    turnIndex = data.turnIndex;
    endMatchScores = data.endMatchScores;
    moveNumber = data.moveNumber ? data.moveNumber : 0;
    randomSeed = data.randomSeed;
    lastMove = data.lastMove;
    lastState = data.lastState;
    currentState = data.currentState;
    lastVisibleTo = data.lastVisibleTo;
    currentVisibleTo = data.currentVisibleTo;
  }

  function getIntercom() {
    if ($window.Intercom !== undefined) {
      return $window.Intercom.getInstance();
    }
    return null;
  }

  function broadcastUpdateUi() {
    var matchState = getMatchState();
    var intercom = getIntercom();
    if (intercom != null) {
      $window.localStorage.setItem($window.location.toString(), angular.toJson(matchState));
      intercom.emit('broadcastUpdateUi', matchState);
    } else {
      sendUpdateUi();
    }
  }

  function gotBroadcastUpdateUi(data) {
    $log.info("gotBroadcastUpdateUi:", data);
    setMatchState(data);
    sendUpdateUi();
  }

  function delayedSendUpdateUi() {
    var moveForIndex = getMoveForPlayerIndex(turnIndex, lastMove);
    var stateBeforeMove = getStateForPlayerIndex(turnIndex, lastState, lastVisibleTo);
    var stateAfterMove = getStateForPlayerIndex(turnIndex, currentState, currentVisibleTo);
    if (lastMove.length > 0 && game.isMoveOk(
      {
        move : moveForIndex,
        turnIndexBeforeMove : turnIndexBeforeMove,
        turnIndexAfterMove : turnIndex,
        stateBeforeMove : stateBeforeMove,
        stateAfterMove : stateAfterMove,
        numberOfPlayers: playersInfo.length
      }) !== true) {
      throwError("You declared a hacker for a legal move! move=" + moveForIndex);
    }

    game.updateUI(
      {
        move : moveForIndex,
        turnIndexBeforeMove : turnIndexBeforeMove,
        turnIndexAfterMove : turnIndex,
        stateBeforeMove : stateBeforeMove,
        stateAfterMove : stateAfterMove,
        yourPlayerIndex : getYourPlayerIndex(),
        playersInfo : playersInfo,
        playMode: playMode,
        moveNumber: moveNumber,
        randomSeed: randomSeed,
        endMatchScores: endMatchScores
      });
  }

  function sendUpdateUi() {
    if ($rootScope.settings.simulateServerDelayMilliseconds === 0) {
      delayedSendUpdateUi();
    } else {
      $timeout(delayedSendUpdateUi, $rootScope.settings.simulateServerDelayMilliseconds); // Delay to simulate server delay.
    }
  }

  function makeMove(operations) {
    if (!game) {
      throwError("You must call setGame before any other method.");
    }
    // Making sure only turnIndex can make the move
    if (turnIndex === -1) {
      throwError("You cannot send a move after the game ended!");
    }
    if (getYourPlayerIndex() !== turnIndex) {
      throwError("Expected a move from turnIndex=" + turnIndex + " but got the move from index=" + getYourPlayerIndex());
    }

    lastState = clone(currentState);
    lastVisibleTo = clone(currentVisibleTo);
    turnIndexBeforeMove = turnIndex;
    turnIndex = -1;
    lastMove = operations;
    moveNumber++;
    if (randomSeed) {
      Math.seedrandom(randomSeed + moveNumber); // Math.random is used only in processApiOperation
    }
    setTurnOrEndMatchCount = 0;
    for (var i = 0; i < lastMove.length; i++) {
      processApiOperation(lastMove[i]);
    }
    // We must have either SetTurn or EndMatch
    if (setTurnOrEndMatchCount !== 1) {
      throwError("We must have either SetTurn or EndMatch, but not both: setTurnOrEndMatchCount=" + setTurnOrEndMatchCount);
    }
    if (!(turnIndex >= -1 && turnIndex < playersInfo.length)) {
      throwError("turnIndex must be between -1 and " + playersInfo.length + ", but it was " + turnIndex + ".");
    }
    broadcastUpdateUi();
  }

  function setGame(_game) {
    if (game !== undefined) {
      throwError("You can call setGame only once");
    }
    game = _game;
    get(game, "minNumberOfPlayers");
    get(game, "maxNumberOfPlayers");
    get(game, "isMoveOk");
    get(game, "updateUI");

    init();
    var intercom = getIntercom();
    if (intercom != null) {
      intercom.on('broadcastUpdateUi', gotBroadcastUpdateUi);
      var matchState = $window.localStorage.getItem($window.location.toString());
      if (!isNull(matchState)) {
        setMatchState(angular.fromJson(matchState));
      }
    }
    sendUpdateUi();
  }


  function isTie() {
    if (!endMatchScores) {
      return false;
    }
    var score = endMatchScores[0];
    for (var i = 0; i < endMatchScores.length; i++) {
      if (score !== endMatchScores[i]) {
        return false;
      }
    }
    return true;
  }
  function getWinnerIndex() {
    if (!endMatchScores || isTie()) {
      return null;
    }
    var winnerIndex = 0;
    for (var i = 0; i < endMatchScores.length; i++) {
      if (endMatchScores[winnerIndex] < endMatchScores[i]) {
        winnerIndex = i;
      }
    }
    return winnerIndex;
  }

  this.getTurnIndex = function () { return turnIndex; };
  this.getYourPlayerIndex = getYourPlayerIndex;
  this.isYourTurn = function () { return turnIndex !== -1 && turnIndex === getYourPlayerIndex(); };
  this.getEndMatchScores = function () { return endMatchScores; };
  this.isTie = isTie;
  this.getWinnerIndex = getWinnerIndex;
  this.isWinner = function () { return getWinnerIndex() === getYourPlayerIndex(); };

  this.setGame = setGame;
  this.makeMove = makeMove;
  this.startNewMatch = startNewMatch;
  this.init = init;
  this.setPlayMode = setPlayMode;
  this.setRandomSeed = setRandomSeed;
  this.getMatchState = getMatchState;
  this.setMatchState = setMatchState;
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
.service('gameService',
    ["$window", "$log", "stateService", "messageService", "$timeout",
      function($window, $log, stateService, messageService, $timeout) {

    'use strict';

    var isLocalTesting = $window.parent === $window ||
        $window.location.search === "?test";

    // We verify that you call makeMove at most once for every updateUI (and only when it's your turn)
    var lastUpdateUI = null;
    function passUpdateUI(updateUI) {
      return function (params) {
        lastUpdateUI = params;
        updateUI(params);
      };
    }

    function makeMove(move) {
      $log.info(["Making move:", move]);
      if (!lastUpdateUI) {
        throw new Error("Game called makeMove before getting updateUI or it called makeMove more than once for a single updateUI.");
      }
      var wasYourTurn = lastUpdateUI.turnIndexAfterMove >= 0 && // game is ongoing
          lastUpdateUI.yourPlayerIndex === lastUpdateUI.turnIndexAfterMove; // it's my turn
      if (!wasYourTurn) {
        throw new Error("Game called makeMove when it wasn't your turn: yourPlayerIndex=" + lastUpdateUI.yourPlayerIndex + " turnIndexAfterMove=" + lastUpdateUI.turnIndexAfterMove);
      }
      if (!move || !move.length) {
        throw new Error("Game called makeMove with an empty move=" + move);
      }
      lastUpdateUI = null; // to make sure you don't call makeMove until you get the next updateUI.

      if (isLocalTesting) {
        $timeout(function () {
          stateService.makeMove(move);
        }, 100);
      } else {
        messageService.sendMessage({makeMove: move});
      }
    }

    function createPlayersInfo(game) {
      var playersInfo = [];
      for (var i = 0; i < game.maxNumberOfPlayers; i++) {
        playersInfo.push({playerId : "" + (i + 42)});
      }
      return playersInfo;
    }

    function setGame(game) {
      $window.gameDeveloperEmail = game.gameDeveloperEmail;
      game.updateUI = passUpdateUI(game.updateUI);
      if (isLocalTesting) {
        stateService.setGame(game);
      } else {
        var isMoveOk = game.isMoveOk;
        var updateUI = game.updateUI;

        messageService.addMessageListener(function (message) {
          $window.lastMessage = message;
          if (message.isMoveOk !== undefined) {
            var isMoveOkResult = isMoveOk(message.isMoveOk);
            if (isMoveOkResult !== true) {
              isMoveOkResult = {result: isMoveOkResult, isMoveOk: message.isMoveOk};
            }
            messageService.sendMessage({isMoveOkResult: isMoveOkResult});
          } else if (message.updateUI !== undefined) {
            lastUpdateUI = message.updateUI;
            updateUI(message.updateUI);
          }
        });

        // You can't send functions using postMessage.
        delete game.isMoveOk;
        delete game.updateUI;
        messageService.sendMessage({gameReady : game});

        // Show an empty board to a viewer (so you can't perform moves).
        $log.info("Passing a 'fake' updateUI message in order to show an empty board to a viewer (so you can NOT perform moves)");
        updateUI({
          move : [],
          turnIndexBeforeMove : 0,
          turnIndexAfterMove : 0,
          stateBeforeMove : null,
          stateAfterMove : {},
          yourPlayerIndex : -2,
          playersInfo : createPlayersInfo(game),
          playMode: "passAndPlay",
          endMatchScores: null
        });
      }
    }

    this.makeMove = makeMove;
    this.setGame = setGame;
}]);
;angular.module('myApp').factory('alphaBetaService', [function() {

  'use strict';

  /**
   * Does alpha-beta search, starting from startingState,
   * where the first move is done by playerIndex (playerIndex is either 0 or 1),
   * then the next move is done by 1-playerIndex, etc.
   *
   * getNextStates(state, playerIndex) should return an array of the following states
   * and if state is a terminal state it should return an empty array.
   *
   * getStateScoreForIndex0(state, playerIndex) should return a score for
   * the state as viewed by player index 0, i.e.,
   * if player index 0 is probably winning then the score should be high.
   * Return Number.POSITIVE_INFINITY is player index 0 is definitely winning,
   * and Number.NEGATIVE_INFINITY if player index 0 is definitely losing.
   *
   * getDebugStateToString can either be null (and then there is no output to console)
   * or it can be a function, where getDebugStateToString(state) should return
   * a string representation of the state (which is used in calls to console.log).
   *
   * alphaBetaLimits is an object that sets a limit on the alpha-beta search,
   * and it has either a millisecondsLimit or maxDepth field:
   * millisecondsLimit is a time limit, and maxDepth is a depth limit.
   */
  function alphaBetaDecision(
      startingState, playerIndex, getNextStates, getStateScoreForIndex0,
      getDebugStateToString, alphaBetaLimits) {
    // Checking input
    if (!startingState || !getNextStates || !getStateScoreForIndex0) {
      throw new Error("startingState or getNextStates or getStateScoreForIndex0 is null/undefined");
    }
    if (playerIndex !== 0 && playerIndex !== 1) {
      throw new Error("playerIndex must be either 0 or 1");
    }
    if (!alphaBetaLimits.millisecondsLimit && !alphaBetaLimits.maxDepth) {
      throw new Error("alphaBetaLimits must have either millisecondsLimit or maxDepth");
    }

    var startTime = new Date().getTime(); // used for the time limit
    if (alphaBetaLimits.maxDepth) {
      return getScoreForIndex0(
          startingState, playerIndex, getNextStates, getStateScoreForIndex0,
          getDebugStateToString, alphaBetaLimits,
          startTime, 0,
          Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY).bestState;
    }
    // For time limits (without maxDepth), we do iterative deepening (A* search).
    if (getDebugStateToString != null) {
      console.log("Doing iterative-deepeninh (A*) until we run out of time or find a certain win/lose move.");
    }
    var maxDepth = 1;
    var bestState;
    while (true) {
      if (getDebugStateToString != null) {
        console.log("Alpha-beta search until maxDepth=" + maxDepth);
      }
      var nextBestStateAndScore = getScoreForIndex0(
          startingState, playerIndex, getNextStates, getStateScoreForIndex0,
          getDebugStateToString,
          {maxDepth: maxDepth, millisecondsLimit: alphaBetaLimits.millisecondsLimit},
          startTime, 0,
          Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
      var nextBestScore = nextBestStateAndScore.bestScore;
      var nextBestState = nextBestStateAndScore.bestState;
      if (nextBestScore === Number.POSITIVE_INFINITY ||
          nextBestScore === Number.NEGATIVE_INFINITY) {
        var isWin = nextBestScore ===
            (playerIndex === 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        console.log("Discovered that AI is going to " +
            (isWin ? "win" : "lose") + " with maxDepth=" + maxDepth);
        if (getDebugStateToString != null) {
            console.log("Best state is " + getDebugStateToString(nextBestState));
        }
        return nextBestState;
      }
      var isHalfTimePassed =
          isTimeout({millisecondsLimit: alphaBetaLimits.millisecondsLimit / 2}, startTime);
      var isAllTimePassed = isTimeout(alphaBetaLimits, startTime);
      if (isHalfTimePassed || isAllTimePassed) {
        // If we run out of half the time, then no point of starting a new search that
        // will most likely take more time than all previous searches.
        // It's more accurate to return the best state for the previous alpha-beta search
        // if we run out of time, because we finished traversing all
        // immediate children of the starting state.
        var result = !isAllTimePassed || maxDepth === 1 ? nextBestState : bestState;
        if (isAllTimePassed) {
          console.log("Run out of time when maxDepth=" + maxDepth +
              ", so returning the best state for maxDepth=" +
              (maxDepth === 1 ? 1 : maxDepth - 1));
        } else {
          console.log("Run out of half the time when maxDepth=" + maxDepth +
              ", so no point of exploring the next depth.");
        }
        if (getDebugStateToString != null) {
            console.log("Best state is " + getDebugStateToString(result));
        }
        return result;
      }
      bestState = nextBestState;
      maxDepth++;
    }
  }

  function isTimeout(alphaBetaLimits, startTime) {
    return alphaBetaLimits.millisecondsLimit &&
        new Date().getTime() - startTime > alphaBetaLimits.millisecondsLimit;
  }

  function getScoreForIndex0(
      startingState, playerIndex, getNextStates, getStateScoreForIndex0,
      getDebugStateToString, alphaBetaLimits, startTime, depth, alpha, beta) {
    var bestScore = null;
    var bestState = null;
    if (isTimeout(alphaBetaLimits, startTime)) {
      if (getDebugStateToString != null) {
        console.log("Run out of time, just quitting from this traversal.");
      }
      return {bestScore: 0, bestState: null}; // This traversal is "ruined" anyway because we ran out of time.
    }
    if (depth === alphaBetaLimits.maxDepth) {
      bestScore = getStateScoreForIndex0(startingState, playerIndex);
      if (getDebugStateToString != null) {
        console.log("Max depth reached, score is " + bestScore);
      }
      return {bestScore: bestScore, bestState: null};
    }
    var states = getNextStates(startingState, playerIndex);
    if (getDebugStateToString != null) {
      console.log(getDebugStateToString(startingState) + " has " + states.length + " next states");
    }
    if (states.length === 0) {
      bestScore = getStateScoreForIndex0(startingState, playerIndex);
      if (getDebugStateToString != null) {
        console.log("Terminal state, score is " + bestScore);
      }
      return {bestScore: bestScore, bestState: null};
    }
    for (var i = 0; i < states.length; i++) {
      var state = states[i];
      var scoreForIndex0 = getScoreForIndex0(
          state, 1 - playerIndex, getNextStates, getStateScoreForIndex0,
          getDebugStateToString, alphaBetaLimits,
          startTime, depth + 1, alpha, beta).bestScore;

      if (getDebugStateToString != null) {
        console.log("Score of " + getDebugStateToString(state) + " is " + scoreForIndex0);
      }
      if (bestScore === null ||
          playerIndex === 0 && scoreForIndex0 > bestScore ||
          playerIndex === 1 && scoreForIndex0 < bestScore) {
        bestScore = scoreForIndex0;
        bestState = state;
      }
      if (playerIndex === 0) {
        if (bestScore >= beta) {
          return {bestScore: bestScore, bestState: bestState};
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (bestScore <= alpha) {
          return {bestScore: bestScore, bestState: bestState};
        }
        beta = Math.min(beta, bestScore);
      }
    }
    if (getDebugStateToString != null) {
      console.log("Best next state for playerIndex " + playerIndex + " is " + getDebugStateToString(bestState) + " with score of " + bestScore);
    }
    return {bestScore: bestScore, bestState: bestState};
  }

  return {alphaBetaDecision: alphaBetaDecision};
}]);
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
  window.angularTranslationsLoaded = function (lang, codeToL10N) {
    window.angularTranslations = codeToL10N;
  };
  var script = "<script crossorigin='anonymous' src='languages/" + language + ".js'></script>";
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
