'use strict';

angular.module('platformApp', [])
.controller('PlatformCtrl', function ($sce, $scope, $rootScope, $log, $window, platformMessageService, stateService) {

  var platformUrl = $window.location.search;
  var gameUrl = platformUrl.length > 1 ? platformUrl.substring(1) : null;
  if (gameUrl === null) {
    $log.error("You must pass the game url like this: ...platform.html?<GAME_URL> , e.g., http://yoav-zibin.github.io/emulator/platform.html?http://yoav-zibin.github.io/TicTacToe/game.html");
    $window.alert("You must pass the game url like this: ...platform.html?<GAME_URL> , e.g., ...platform.html?http://yoav-zibin.github.io/TicTacToe/game.html");
    return;
  }
  $scope.gameUrl = $sce.trustAsResourceUrl(gameUrl);
  var gotGameReady = false;
  $scope.startNewMatch = function () {
    stateService.startNewMatch();
  };
  $scope.getStatus = function () {
    if (!gotGameReady) {
      return "Waiting for 'gameReady' message from the game...";
    }
    var matchState = stateService.getMatchState();
    if (matchState.endMatchScores !== null) {
      return "Match ended with scores: " + matchState.endMatchScores;
    }
    return "Match is ongoing! Turn of player index " + matchState.turnIndex;
  };
  $scope.playMode = "passAndPlay";
  stateService.setPlayMode($scope.playMode);
  $scope.$watch('playMode', function() {
    stateService.setPlayMode($scope.playMode);
  });

  platformMessageService.addMessageListener(function (message) {
    if (message.gameReady !== undefined) {
      gotGameReady = true;
      var game = message.gameReady;
      game.isMoveOk = function (params) {
        platformMessageService.sendMessage({isMoveOk: params});
        return true;
      };
      game.updateUI = function (params) {
        platformMessageService.sendMessage({updateUI: params});
      };
      stateService.setGame(game);
    } else if (message.isMoveOkResult !== undefined) {
      if (message.isMoveOkResult !== true) {
        $window.alert("isMoveOk returned " + message.isMoveOkResult);
      }
    } else if (message.makeMove !== undefined) {
      stateService.makeMove(message.makeMove);
    }
  });
})
.service('platformMessageService', function($window, $log, $rootScope) {
  this.sendMessage = function (message) {
    $log.info("Platform sent message", message);
    $window.document.getElementById("game_iframe").contentWindow.postMessage(
      message, "*");
  };
  this.addMessageListener = function (listener) {
    $window.addEventListener("message", function (event) {
      $rootScope.$apply(function () {
        var message = event.data;
        $log.info("Platform got message", message);
        listener(message);
      });
    }, false);
  };
})
.service('stateService', function($window, $timeout, $log, $rootScope) {

  var game;
  var minNumberOfPlayers;
  var maxNumberOfPlayers;

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
  var playMode;

  // Global settings
  $rootScope.settings = {};
  $rootScope.settings.simulateServerDelayMilliseconds = 500;

  function setPlayMode(_playMode) {
    playMode = _playMode;
    if (game !== undefined) {
      setPlayers();
      sendUpdateUi();
    }
  }

  function setPlayers() {
    playersInfo = [];
    for (var i = 0; i < game.maxNumberOfPlayers; i++) {
      var playerId = ((i === (game.maxNumberOfPlayers - 1))
        && (playMode === "playAgainstTheComputer"))
          ? "" : // The playerId for the computer is "".
          "" + (i + 42);
      playersInfo.push({playerId : playerId});
    }
  }

  function init() {
    setPlayers();
    currentState = {};
    lastState = null;
    currentVisibleTo = {};
    lastVisibleTo = null;
    lastMove = [];
    turnIndexBeforeMove = 0;
    turnIndex = 0; // can be -1 in the last updateUI after the game ended.
    endMatchScores = null;
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
    $window.alert("Error: " + msg);
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
      var index = Math.floor(Math.random() * keysCopy.length);
      var removed = keysCopy.splice(index, 1);
      result.push(removed);
    }
    return result;
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
      var randomValue = Math.floor((Math.random() * (to - from)) + from);
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
      if (isNull(keys) || (keys.length === 0)) {
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
    } else {
      throwError("Illegal operation, it must contain either set, setRandomInteger, setVisibility, delete, shuffle, or endMatch: " + angular.toJson(operation, true));
    }
  }

  function hackerFoundCallback(params) {
    var gameDeveloperEmail = get(params, 'gameDeveloperEmail');
    var emailSubject = get(params, 'emailSubject');
    var emailBody = get(params, 'emailBody');
    // TODO: email the developer.
    throwError("Declared a hacker");
  }

  function getYourPlayerIndex() {
    return (playMode === "playWhite") ? 0 :
          (playMode === "playBlack") ? 1 :
          (playMode === "playViewer") ? -1 :
          turnIndex;
  }

  function getMatchState() {
    return {
      turnIndexBeforeMove: turnIndexBeforeMove,
      turnIndex: turnIndex,
      endMatchScores: endMatchScores,
      lastMove: lastMove,
      lastState: lastState,
      currentState: currentState,
      lastVisibleTo: lastVisibleTo,
      currentVisibleTo: currentVisibleTo
    };
  }

  function setMatchState(data) {
    turnIndexBeforeMove = data.turnIndexBeforeMove;
    turnIndex = data.turnIndex;
    endMatchScores = data.endMatchScores;
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
      $window.localStorage.setItem("matchState", angular.toJson(matchState));
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
        stateAfterMove : stateAfterMove
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
        playersInfo : playersInfo
      });
  }

  function sendUpdateUi() {
    $timeout(delayedSendUpdateUi, $rootScope.settings.simulateServerDelayMilliseconds); // Delay to simulate server delay.
  }

  function makeMove(operations) {
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
    setTurnOrEndMatchCount = 0;
    for (var i = 0; i < lastMove.length; i++) {
      processApiOperation(lastMove[i]);
    }
    // We must have either SetTurn or EndMatch
    if (setTurnOrEndMatchCount !== 1) {
      throwError("We must have either SetTurn or EndMatch, but not both");
    }
    if (!(turnIndex >= -1 && turnIndex < playersInfo.length)) {
      throwError("turnIndex must be between -1 and " + playersInfo.length + ", but it was " + turnIndex + ".");
    }
    broadcastUpdateUi();
  };

  function setGame(_game) {
    if (game !== undefined) {
      throwError("You can call setGame only once");
    }
    game = _game;
    get(game, "gameDeveloperEmail");
    get(game, "minNumberOfPlayers");
    get(game, "maxNumberOfPlayers");
    get(game, "isMoveOk");
    get(game, "updateUI");

    init();
    var intercom = getIntercom();
    if (intercom != null) {
      intercom.on('broadcastUpdateUi', gotBroadcastUpdateUi);
      var matchState = $window.localStorage.getItem("matchState");
      if (!isNull(matchState)) {
        setMatchState(angular.fromJson(matchState));
      }
    }
    sendUpdateUi();
  }

  this.setGame = setGame;
  this.makeMove = makeMove;
  this.startNewMatch = startNewMatch;
  this.setPlayMode = setPlayMode;
  this.getMatchState = getMatchState;
});
