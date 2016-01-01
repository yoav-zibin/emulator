var gamingPlatform;
(function (gamingPlatform) {
    var stateService;
    (function (stateService) {
        var game;
        var currentState;
        var lastState;
        var currentVisibleTo;
        var lastVisibleTo;
        var lastMove;
        var turnIndexBeforeMove;
        var turnIndex = 0; // turn after the move (-1 when the game ends)
        var endMatchScores = null;
        var setTurnOrEndMatchCount = 0;
        var playersInfo;
        var playMode = "passAndPlay"; // Default play mode
        var randomSeed;
        var moveNumber;
        var simulateServerDelayMilliseconds = 10;
        function setSimulateServerDelayMilliseconds(_simulateServerDelayMilliseconds) {
            simulateServerDelayMilliseconds = _simulateServerDelayMilliseconds;
        }
        stateService.setSimulateServerDelayMilliseconds = setSimulateServerDelayMilliseconds;
        function setPlayMode(_playMode) {
            playMode = _playMode;
        }
        stateService.setPlayMode = setPlayMode;
        function setRandomSeed(_randomSeed) {
            randomSeed = _randomSeed;
        }
        stateService.setRandomSeed = setRandomSeed;
        function setPlayers(_playersInfo) {
            playersInfo = _playersInfo;
        }
        stateService.setPlayers = setPlayers;
        function initNewMatch() {
            if (!game) {
                throwError("You must call setGame before any other method.");
            }
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
        stateService.initNewMatch = initNewMatch;
        //Function to get the keys from a JSON object
        function getKeys(object) {
            if (Object && Object.keys) {
                return Object.keys(object);
            }
            var keys = [];
            for (var key in object) {
                keys.push(key);
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
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            gamingPlatform.log.error("Throwing an error with these arguments=", args);
            var msg = args.join(", ");
            throw new Error(msg);
        }
        function getMoveForPlayerIndex(playerIndex, move) {
            var moveForPlayer = [];
            for (var _i = 0; _i < move.length; _i++) {
                var operation = move[_i];
                if (!isNull(operation.set) &&
                    !isNull(operation.set.visibleToPlayerIndexes) &&
                    operation.set.visibleToPlayerIndexes.indexOf(playerIndex) === -1) {
                    moveForPlayer.push({
                        set: {
                            key: operation.set.key,
                            value: null,
                            visibleToPlayerIndexes: operation.set.visibleToPlayerIndexes
                        }
                    });
                }
                else {
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
            for (var _i = 0; _i < keys.length; _i++) {
                var key = keys[_i];
                var visibleToPlayerIndexes = visibleTo[key];
                var value = null;
                if (isNull(visibleToPlayerIndexes) || visibleToPlayerIndexes.indexOf(playerIndex) > -1) {
                    value = gameState[key];
                }
                result[key] = value;
            }
            return result;
        }
        function shuffle(keys) {
            var keysCopy = keys.slice(0);
            var result = [];
            while (keysCopy.length >= 1) {
                var index = randomFromTo(0, keysCopy.length);
                var removed = keysCopy.splice(index, 1)[0];
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
        stateService.randomFromTo = randomFromTo;
        function processApiOperation(operation) {
            //Check for all types of Operations
            var key;
            var visibleToPlayerIndexes;
            if (!isNull(operation.set)) {
                var opSet = operation.set;
                key = opSet.key;
                visibleToPlayerIndexes = opSet.visibleToPlayerIndexes;
                var value = opSet.value;
                if (isNull(key) || isNull(value)) {
                    throwError("Fields key and value in Set operation must be non null. operation=" + angular.toJson(operation, true));
                }
                currentState[key] = value;
                if (visibleToPlayerIndexes) {
                    currentVisibleTo[key] = visibleToPlayerIndexes;
                }
                else {
                    delete currentVisibleTo[key];
                }
            }
            else if (!isNull(operation.setTurn)) {
                var setTurn = operation.setTurn;
                turnIndex = setTurn.turnIndex;
                setTurnOrEndMatchCount++;
            }
            else if (!isNull(operation.setRandomInteger)) {
                var setRandomInteger = operation.setRandomInteger;
                key = setRandomInteger.key;
                var from = setRandomInteger.from;
                var to = setRandomInteger.to;
                if (isNull(key) || isNull(from) || isNull(to)) {
                    throwError("Fields key, from, and to, in SetRandomInteger operation must be non null. operation=" + angular.toJson(operation, true));
                }
                var randomValue = randomFromTo(from, to);
                currentState[key] = randomValue;
                delete currentVisibleTo[key];
            }
            else if (!isNull(operation.setVisibility)) {
                var setVisibility = operation.setVisibility;
                key = setVisibility.key;
                visibleToPlayerIndexes = setVisibility.visibleToPlayerIndexes;
                if (isNull(key)) {
                    throwError("Fields key in SetVisibility operation must be non null. operation=" + angular.toJson(operation, true));
                }
                if (visibleToPlayerIndexes) {
                    currentVisibleTo[key] = visibleToPlayerIndexes;
                }
                else {
                    delete currentVisibleTo[key];
                }
            }
            else if (!isNull(operation['delete'])) {
                var opDelete = operation['delete'];
                key = opDelete.key;
                if (isNull(key)) {
                    throwError("Field key in Delete operation must be non null. operation=" + angular.toJson(operation, true));
                }
                delete currentState[key];
                delete currentVisibleTo[key];
            }
            else if (!isNull(operation.shuffle)) {
                var opShuffle = operation.shuffle;
                var keys = opShuffle.keys;
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
            }
            else if (!isNull(operation.endMatch)) {
                var endMatch = operation.endMatch;
                setTurnOrEndMatchCount++;
                var scores = endMatch.endMatchScores;
                if (isNull(scores) || scores.length !== playersInfo.length) {
                    throwError("Field scores in EndMatch operation must be an array of the same length as the number of players. operation=" + angular.toJson(operation, true));
                }
                endMatchScores = scores;
                if (playMode === "onlyAIs") {
                    gamingPlatform.$timeout(function () { initNewMatch(); }, 1000); // start a new match in 1 second.
                }
            }
            else {
                throwError("Illegal operation, it must contain either set, setRandomInteger, setVisibility, delete, shuffle, or endMatch: " + angular.toJson(operation, true));
            }
        }
        function getYourPlayerIndex() {
            return playMode === "playWhite" ? 0 :
                playMode === "playBlack" ? 1 :
                    playMode === "playViewer" ? -2 :
                        playMode === "playAgainstTheComputer" || playMode === "onlyAIs" ||
                            playMode === "passAndPlay" ? turnIndex :
                            Number(playMode);
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
        stateService.getMatchState = getMatchState;
        function setMatchState(data) {
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
        stateService.setMatchState = setMatchState;
        var lastSentUpdateUI = null; // to prevent sending the same updateUI twice.
        function delayedSendUpdateUi() {
            var yourPlayerIndex = getYourPlayerIndex();
            var moveForIndex = getMoveForPlayerIndex(yourPlayerIndex, lastMove);
            var stateBeforeMove = getStateForPlayerIndex(yourPlayerIndex, lastState, lastVisibleTo);
            var stateAfterMove = getStateForPlayerIndex(yourPlayerIndex, currentState, currentVisibleTo);
            var nextUpdateUI = {
                move: moveForIndex,
                turnIndexBeforeMove: turnIndexBeforeMove,
                turnIndexAfterMove: turnIndex,
                stateBeforeMove: stateBeforeMove,
                stateAfterMove: stateAfterMove,
                numberOfPlayers: playersInfo.length,
                playersInfo: playersInfo,
                yourPlayerIndex: yourPlayerIndex,
                playMode: playMode,
                moveNumber: moveNumber,
                randomSeed: randomSeed,
                endMatchScores: endMatchScores
            };
            if (angular.equals(lastSentUpdateUI, nextUpdateUI))
                return; // Not sending the same updateUI twice.
            lastSentUpdateUI = nextUpdateUI;
            if (lastMove.length > 0 && game.isMoveOk({
                move: moveForIndex,
                turnIndexBeforeMove: turnIndexBeforeMove,
                turnIndexAfterMove: turnIndex,
                stateBeforeMove: stateBeforeMove,
                stateAfterMove: stateAfterMove,
                numberOfPlayers: playersInfo.length
            }) !== true) {
                throwError("You declared a hacker for a legal move! move=" + moveForIndex);
            }
            game.updateUI(nextUpdateUI);
        }
        function sendUpdateUi() {
            if (simulateServerDelayMilliseconds === 0) {
                delayedSendUpdateUi();
            }
            else {
                gamingPlatform.$timeout(function () { delayedSendUpdateUi(); }, simulateServerDelayMilliseconds);
            }
        }
        stateService.sendUpdateUi = sendUpdateUi;
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
            if (randomSeed && Math.seedrandom) {
                Math.seedrandom(randomSeed + moveNumber); // Math.random is used only in processApiOperation
            }
            setTurnOrEndMatchCount = 0;
            for (var _i = 0; _i < operations.length; _i++) {
                var operation = operations[_i];
                processApiOperation(operation);
            }
            // We must have either SetTurn or EndMatch
            if (setTurnOrEndMatchCount !== 1) {
                throwError("We must have either SetTurn or EndMatch, but not both: setTurnOrEndMatchCount=" + setTurnOrEndMatchCount);
            }
            if (!(turnIndex >= -1 && turnIndex < playersInfo.length)) {
                throwError("turnIndex must be between -1 and " + playersInfo.length + ", but it was " + turnIndex + ".");
            }
            sendUpdateUi();
        }
        stateService.makeMove = makeMove;
        function setGame(_game) {
            if (game !== undefined) {
                throwError("You can call setGame only once");
            }
            game = _game;
        }
        stateService.setGame = setGame;
        function getEndMatchScores() {
            return endMatchScores;
        }
        stateService.getEndMatchScores = getEndMatchScores;
    })(stateService = gamingPlatform.stateService || (gamingPlatform.stateService = {}));
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=stateService.js.map