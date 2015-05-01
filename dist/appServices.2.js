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
