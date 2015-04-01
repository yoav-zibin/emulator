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
.service('gameService',
    ["$window", "$log", "stateService", "messageService",
      function($window, $log, stateService, messageService) {

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
        stateService.makeMove(move);
      } else {
        messageService.sendMessage({makeMove: move, gameUrl: location.toString()});
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
              isMoveOkResult = {gameUrl: location.toString(), isMoveOkResult: isMoveOkResult};
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
;angular.module('myApp')
  .service('messageService',
      ["$window", "$log", "$rootScope",
        function($window, $log, $rootScope) {

    'use strict';

    this.sendMessage = function (message) {
      $log.info("Game sent message", message);
      $window.parent.postMessage(message, "*");
    };
    this.addMessageListener = function (listener) {
      $window.addEventListener("message", function (event) {
        var source = event.source;
        if (source !== $window.parent) {
          return;
        }
        $rootScope.$apply(function () {
          var message = event.data;
          $log.info("Game got message", message);
          listener(message);
        });
      }, false);
    };
  }])
  .factory('$exceptionHandler',
      ["$window", "$log",
        function ($window, $log) {

    'use strict';

    return function (exception, cause) {
      $log.error("Game had an exception:", exception, cause);
      var exceptionString = angular.toJson({exception: exception, stackTrace: exception.stack, cause: cause, lastMessage: $window.lastMessage}, true);
      var message =
          {
            emailJavaScriptError:
              {
                gameDeveloperEmail: $window.gameDeveloperEmail,
                emailSubject: "Error in game " + $window.location,
                emailBody: exceptionString
              }
          };
      $window.parent.postMessage(message, "*");
      throw exception;
    };
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
    var states = getNextStates(startingState, playerIndex);
    var bestScore = null;
    var bestState = null;
    if (getDebugStateToString != null) {
      console.log(getDebugStateToString(startingState) + " has " + states.length + " next states");
    }
    if (states.length === 0 ||
        depth === alphaBetaLimits.maxDepth ||
        isTimeout(alphaBetaLimits, startTime)) {
      bestScore = getStateScoreForIndex0(startingState, playerIndex);
      if (getDebugStateToString != null) {
        console.log(
          (states.length === 0 ? "Terminal state"
              : depth === alphaBetaLimits.maxDepth ? "Max depth reached"
              : "Time limit reached") + ", score is " + bestScore);
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

    var doc = $window.document;
    var widthToHeight = null;
    var oldSizes = null;

    function setWidthToHeight(_widthToHeight) {
      widthToHeight = _widthToHeight;
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
      var windowWidth = $window.innerWidth; // doc.body.clientWidth
      var windowHeight = $window.innerHeight; // I saw cases where doc.body.clientHeight was 0.
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

      var gameArea = doc.getElementById('gameArea');
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
      var marginTop = -windowHeight / 2;
      var marginLeft = -windowWidth / 2;
      gameArea.style.width = windowWidth + 'px';
      gameArea.style.height = windowHeight + 'px';
      gameArea.style.marginTop = '' + marginTop + 'px';
      gameArea.style.marginLeft = '' + marginLeft + 'px';
      gameArea.style.position = "absolute";
      gameArea.style.left = "50%";
      gameArea.style.top = "50%";
    }

    $window.onresize = rescale;
    $window.onorientationchange = rescale;
    doc.addEventListener("onresize", rescale);
    doc.addEventListener("orientationchange", rescale);
    setInterval(rescale, 1000);

    this.setWidthToHeight = setWidthToHeight;
  }]);
