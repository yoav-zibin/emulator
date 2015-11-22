"use strict"; var emulatorServicesCompilationDate = "Sun Nov 22 06:09:07 EST 2015";
;var log;
(function (log_1) {
    var ILogLevel = (function () {
        function ILogLevel() {
        }
        ILogLevel.ALWAYS = 'ALWAYS';
        ILogLevel.LOG = 'LOG';
        ILogLevel.INFO = 'INFO';
        ILogLevel.DEBUG = 'DEBUG';
        ILogLevel.WARN = 'WARN';
        ILogLevel.ERROR = 'ERROR';
        return ILogLevel;
    })();
    var alwaysLogs = [];
    var lastLogs = [];
    var startTime = getCurrentTime();
    function getCurrentTime() {
        return window.performance ? window.performance.now() : new Date().getTime();
    }
    log_1.getCurrentTime = getCurrentTime;
    function getLogEntry(args, logLevel) {
        return { millisecondsFromStart: getCurrentTime() - startTime, args: args, logLevel: logLevel };
    }
    function storeLog(args, logLevel) {
        if (lastLogs.length > 100) {
            lastLogs.shift();
        }
        lastLogs.push(getLogEntry(args, logLevel));
    }
    function getLogs() {
        return alwaysLogs.concat(lastLogs);
    }
    log_1.getLogs = getLogs;
    function alwaysLog() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        alwaysLogs.push(getLogEntry(args, ILogLevel.ALWAYS));
        console.info.apply(console, args);
    }
    log_1.alwaysLog = alwaysLog;
    function info() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.INFO);
        console.info.apply(console, args);
    }
    log_1.info = info;
    function debug() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.DEBUG);
        console.debug.apply(console, args);
    }
    log_1.debug = debug;
    function warn() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.WARN);
        console.warn.apply(console, args);
    }
    log_1.warn = warn;
    function error() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.ERROR);
        console.error.apply(console, args);
    }
    log_1.error = error;
    function log() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args, ILogLevel.LOG);
        console.log.apply(console, args);
    }
    log_1.log = log;
})(log || (log = {}));
;var stateService;
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
        log.error("Throwing an error with these arguments=", args);
        var msg = args.join(", ");
        throw new Error(msg);
    }
    function getMoveForPlayerIndex(playerIndex, move) {
        var moveForPlayer = [];
        for (var _i = 0, move_1 = move; _i < move_1.length; _i++) {
            var operation = move_1[_i];
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
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
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
                $timeout(function () { initNewMatch(); }, 1000); // start a new match in 1 second.
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
    function delayedSendUpdateUi() {
        var yourPlayerIndex = getYourPlayerIndex();
        var moveForIndex = getMoveForPlayerIndex(yourPlayerIndex, lastMove);
        var stateBeforeMove = getStateForPlayerIndex(yourPlayerIndex, lastState, lastVisibleTo);
        var stateAfterMove = getStateForPlayerIndex(yourPlayerIndex, currentState, currentVisibleTo);
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
        game.updateUI({
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
        });
    }
    function sendUpdateUi() {
        if (simulateServerDelayMilliseconds === 0) {
            delayedSendUpdateUi();
        }
        else {
            $timeout(function () { delayedSendUpdateUi(); }, simulateServerDelayMilliseconds);
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
        for (var _i = 0, operations_1 = operations; _i < operations_1.length; _i++) {
            var operation = operations_1[_i];
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
})(stateService || (stateService = {}));
;var messageService;
(function (messageService) {
    var gameUrl = location.toString();
    function sendMessage(message) {
        log.info("Game sent message", message);
        message.gameUrl = gameUrl;
        window.parent.postMessage(message, "*");
    }
    messageService.sendMessage = sendMessage;
    ;
    function addMessageListener(listener) {
        window.addEventListener("message", function (event) {
            var source = event.source;
            if (source !== window.parent) {
                return;
            }
            var message = event.data;
            log.info("Game got message", message);
            $rootScope.$apply(function () {
                listener(message);
            });
        }, false);
    }
    messageService.addMessageListener = addMessageListener;
    ;
})(messageService || (messageService = {}));
;var gameService;
(function (gameService) {
    var isLocalTesting = window.parent === window ||
        window.location.search === "?test";
    gameService.playMode = location.search === "?onlyAIs" ? "onlyAIs"
        : location.search === "?playAgainstTheComputer" ? "playAgainstTheComputer"
            : location.search.indexOf("?playMode=") === 0 ? location.search.substr("?playMode=".length)
                : "passAndPlay"; // Default play mode
    // We verify that you call makeMove at most once for every updateUI (and only when it's your turn)
    var lastUpdateUI = null;
    var game;
    function updateUI(params) {
        lastUpdateUI = params;
        game.updateUI(params);
    }
    function makeMove(move) {
        if (!lastUpdateUI) {
            throw new Error("Game called makeMove before getting updateUI or it called makeMove more than once for a single updateUI.");
        }
        var wasYourTurn = lastUpdateUI.turnIndexAfterMove >= 0 &&
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
        }
        else {
            messageService.sendMessage({ makeMove: move });
        }
    }
    gameService.makeMove = makeMove;
    function getPlayers() {
        var playersInfo = [];
        var actualNumberOfPlayers = stateService.randomFromTo(game.minNumberOfPlayers, game.maxNumberOfPlayers + 1);
        for (var i = 0; i < actualNumberOfPlayers; i++) {
            var playerId = gameService.playMode === "onlyAIs" ||
                i !== 0 && gameService.playMode === "playAgainstTheComputer" ?
                "" :
                "" + (i + 42);
            playersInfo.push({ playerId: playerId, avatarImageUrl: null, displayName: null });
        }
        return playersInfo;
    }
    var didCallSetGame = false;
    function setGame(_game) {
        game = _game;
        if (didCallSetGame) {
            throw new Error("You can call setGame exactly once!");
        }
        didCallSetGame = true;
        var playersInfo = getPlayers();
        if (isLocalTesting) {
            stateService.setGame({ updateUI: updateUI, isMoveOk: game.isMoveOk });
            stateService.initNewMatch();
            stateService.setPlayMode(gameService.playMode);
            stateService.setPlayers(playersInfo);
            stateService.sendUpdateUi();
        }
        else {
            messageService.addMessageListener(function (message) {
                if (message.isMoveOk) {
                    var isMoveOkResult = game.isMoveOk(message.isMoveOk);
                    if (isMoveOkResult !== true) {
                        isMoveOkResult = { result: isMoveOkResult, isMoveOk: message.isMoveOk };
                    }
                    messageService.sendMessage({ isMoveOkResult: isMoveOkResult });
                }
                else if (message.updateUI) {
                    lastUpdateUI = message.updateUI;
                    updateUI(message.updateUI);
                }
                else if (message.setLanguage) {
                    translate.setLanguage(message.setLanguage.language, message.setLanguage.codeToL10N);
                    // we need to ack this message to the platform so the platform will make the game-iframe visible
                    // (The platform waited until the game got the l10n.)
                    // Using setTimeout to give time for angular to refresh it's UI (the default was in English)
                    setTimeout(function () {
                        messageService.sendMessage({ setLanguageResult: true });
                    });
                }
            });
            messageService.sendMessage({ gameReady: {} });
        }
        // Show an empty board to a viewer (so you can't perform moves).
        log.info("Passing a 'fake' updateUI message in order to show an empty board to a viewer (so you can NOT perform moves)");
        updateUI({
            move: [],
            turnIndexBeforeMove: 0,
            turnIndexAfterMove: 0,
            stateBeforeMove: null,
            stateAfterMove: {},
            yourPlayerIndex: -2,
            playersInfo: playersInfo,
            playMode: "passAndPlay",
            endMatchScores: null,
            moveNumber: 0, randomSeed: "",
            numberOfPlayers: playersInfo.length
        });
    }
    gameService.setGame = setGame;
})(gameService || (gameService = {}));
;var moveService;
(function (moveService) {
    var STATE_KEY = "state";
    function convertOldState(state) {
        //return state ? state[STATE_KEY] : null;
        if (!state)
            return null;
        // TODO: delete (code for TicTacToe backward compatibility)
        if (state[STATE_KEY] === undefined && state.board) {
            return { delta: state.delta, board: state.board };
        }
        return state[STATE_KEY];
    }
    function convertIsMoveOk(params) {
        return {
            turnIndexBeforeMove: params.turnIndexBeforeMove,
            numberOfPlayers: params.numberOfPlayers,
            stateBeforeMove: convertOldState(params.stateBeforeMove),
            move: convertOldMove(params.move)
        };
    }
    function convertUpdate(params) {
        return {
            playersInfo: params.playersInfo,
            yourPlayerIndex: params.yourPlayerIndex,
            playMode: params.playMode,
            turnIndexBeforeMove: params.turnIndexBeforeMove,
            numberOfPlayers: params.numberOfPlayers,
            stateBeforeMove: convertOldState(params.stateBeforeMove),
            move: convertOldMove(params.move)
        };
    }
    function convertOldMove(move) {
        if (!move || move.length === 0) {
            return {
                endMatchScores: null,
                turnIndexAfterMove: 0,
                stateAfterMove: null,
            };
        }
        // TODO: delete (code for TicTacToe backward compatibility)
        if (move.length === 3) {
            move = [move[0], { set: { key: "state", value: { board: move[1].set.value, delta: move[2].set.value } } }];
        }
        if (move.length !== 2 || !(move[0].setTurn || move[0].endMatch) || !move[1].set) {
            throw new Error("Internal error: old move should be an array with 2 operations! old move=" +
                angular.toJson(move, true));
        }
        return {
            endMatchScores: move[0].endMatch ? move[0].endMatch.endMatchScores : null,
            turnIndexAfterMove: move[0].setTurn ? move[0].setTurn.turnIndex : -1,
            stateAfterMove: move[1].set.value,
        };
    }
    function convertNewMove(move) {
        // Do some checks: turnIndexAfterMove is -1 iff endMatchScores is not null.
        var isOver = move.turnIndexAfterMove === -1;
        if (isOver !== (move.endMatchScores !== null)) {
            // Match ongoing
            throw new Error("Illegal move: turnIndexAfterMove can be -1 iff endMatchScores is not null. Move=" +
                angular.toJson(move, true));
        }
        return [
            isOver ? { endMatch: { endMatchScores: move.endMatchScores } } : { setTurn: { turnIndex: move.turnIndexAfterMove } },
            { set: { key: STATE_KEY, value: move.stateAfterMove } }
        ];
    }
    function setGame(game) {
        var oldGame = {
            minNumberOfPlayers: game.minNumberOfPlayers,
            maxNumberOfPlayers: game.maxNumberOfPlayers,
            isMoveOk: function (params) {
                var move = convertIsMoveOk(params);
                log.info("Calling game.checkMoveOk:", move);
                game.checkMoveOk(move);
                return true;
            },
            updateUI: function (params) {
                var newParams = convertUpdate(params);
                log.info("Calling game.updateUI:", newParams);
                game.updateUI(newParams);
            },
        };
        gameService.setGame(oldGame);
    }
    moveService.setGame = setGame;
    function makeMove(move) {
        log.info("Making move:", move);
        gameService.makeMove(convertNewMove(move));
    }
    moveService.makeMove = makeMove;
})(moveService || (moveService = {}));
;function resizeMapArea(params) {
    var imageId = params.imageId;
    var mapId = params.mapId;
    var originalWidth = params.originalWidth;
    var originalHeight = params.originalHeight;
    function rescale() {
        var image = document.getElementById(imageId);
        var map = document.getElementById(mapId);
        var widthScale = image.width / originalWidth;
        var heightScale = image.height / originalHeight;
        //console.log("widthScale=", widthScale, "heightScale=", heightScale);
        var areaElements = map.getElementsByTagName("area");
        for (var areaIndex = 0; areaIndex < areaElements.length; areaIndex++) {
            var areaElement = areaElements[areaIndex];
            var originalCoords = areaElement.getAttribute("data-original-coords");
            if (!originalCoords) {
                areaElement.setAttribute("data-original-coords", areaElement.getAttribute("coords"));
            }
            var coords = areaElement.getAttribute("data-original-coords").split(',');
            var coordsPercent = [];
            for (var i = 0; i < coords.length; ++i) {
                var coordNum = Number(coords[i]);
                if (i % 2 === 0) {
                    coordsPercent[i] = Math.round(coordNum * widthScale);
                }
                else {
                    coordsPercent[i] = Math.round(coordNum * heightScale);
                }
            }
            //console.log("before=", coords, "after=", coordsPercent);
            areaElement.setAttribute("coords", coordsPercent.toString());
        }
    }
    document.addEventListener("onresize", rescale);
    document.addEventListener("orientationchange", rescale);
    setInterval(rescale, 1000);
}
;var alphaBetaService;
(function (alphaBetaService) {
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
    function alphaBetaDecision(startingState, playerIndex, getNextStates, getStateScoreForIndex0, 
        // If you want to see debugging output in the console, then surf to game.html?debug
        getDebugStateToString, alphaBetaLimits) {
        var move = alphaBetaDecisionMayReturnNull(startingState, playerIndex, getNextStates, getStateScoreForIndex0, getDebugStateToString, alphaBetaLimits);
        if (move) {
            return move;
        }
        // We run out of time, but we have to return a non-null move (no matter what).
        return getNextStates(startingState, playerIndex)[0];
    }
    alphaBetaService.alphaBetaDecision = alphaBetaDecision;
    function alphaBetaDecisionMayReturnNull(startingState, playerIndex, getNextStates, getStateScoreForIndex0, 
        // If you want to see debugging output in the console, then surf to game.html?debug
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
            return getScoreForIndex0(startingState, playerIndex, getNextStates, getStateScoreForIndex0, getDebugStateToString, alphaBetaLimits, startTime, 0, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY).bestState;
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
            var nextBestStateAndScore = getScoreForIndex0(startingState, playerIndex, getNextStates, getStateScoreForIndex0, getDebugStateToString, { maxDepth: maxDepth, millisecondsLimit: alphaBetaLimits.millisecondsLimit }, startTime, 0, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
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
            var isHalfTimePassed = isTimeout({ millisecondsLimit: alphaBetaLimits.millisecondsLimit / 2 }, startTime);
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
                }
                else {
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
    function getScoreForIndex0(startingState, playerIndex, getNextStates, getStateScoreForIndex0, 
        // If you want to see debugging output in the console, then surf to game.html?debug
        getDebugStateToString, alphaBetaLimits, startTime, depth, alpha, beta) {
        var bestScore = null;
        var bestState = null;
        if (isTimeout(alphaBetaLimits, startTime)) {
            if (getDebugStateToString != null) {
                console.log("Run out of time, just quitting from this traversal.");
            }
            return { bestScore: 0, bestState: null }; // This traversal is "ruined" anyway because we ran out of time.
        }
        if (depth === alphaBetaLimits.maxDepth) {
            bestScore = getStateScoreForIndex0(startingState, playerIndex);
            if (getDebugStateToString != null) {
                console.log("Max depth reached, score is " + bestScore);
            }
            return { bestScore: bestScore, bestState: null };
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
            return { bestScore: bestScore, bestState: null };
        }
        for (var i = 0; i < states.length; i++) {
            var state = states[i];
            var scoreForIndex0 = getScoreForIndex0(state, 1 - playerIndex, getNextStates, getStateScoreForIndex0, getDebugStateToString, alphaBetaLimits, startTime, depth + 1, alpha, beta).bestScore;
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
                    return { bestScore: bestScore, bestState: bestState };
                }
                alpha = Math.max(alpha, bestScore);
            }
            else {
                if (bestScore <= alpha) {
                    return { bestScore: bestScore, bestState: bestState };
                }
                beta = Math.min(beta, bestScore);
            }
        }
        if (getDebugStateToString != null) {
            console.log("Best next state for playerIndex " + playerIndex + " is " + getDebugStateToString(bestState) + " with score of " + bestScore);
        }
        return { bestScore: bestScore, bestState: bestState };
    }
})(alphaBetaService || (alphaBetaService = {}));
;var resizeGameAreaService;
(function (resizeGameAreaService) {
    var widthToHeight = null;
    var oldSizes = null;
    var doc = window.document;
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
    resizeGameAreaService.setWidthToHeight = setWidthToHeight;
    function round2(num) {
        return Math.round(num * 100) / 100;
    }
    function rescale() {
        if (widthToHeight === null) {
            return;
        }
        var originalWindowWidth = window.innerWidth; // doc.body.clientWidth
        var originalWindowHeight = window.innerHeight; // I saw cases where doc.body.clientHeight was 0.
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
            log.info("Window width/height is 0 so hiding gameArea div.");
            gameArea.style.display = "none";
            return;
        }
        gameArea.style.display = "block";
        var newWidthToHeight = windowWidth / windowHeight;
        if (newWidthToHeight > widthToHeight) {
            windowWidth = round2(windowHeight * widthToHeight);
        }
        else {
            windowHeight = round2(windowWidth / widthToHeight);
        }
        log.info("Window size is " + oldSizes.windowWidth + "x" + oldSizes.windowHeight +
            " so setting gameArea size to " + windowWidth + "x" + windowHeight +
            " because widthToHeight=" + widthToHeight);
        // Take 5% margin (so the game won't touch the end of the screen)
        var keepMargin = 0.95;
        windowWidth *= keepMargin;
        windowHeight *= keepMargin;
        gameArea.style.width = windowWidth + 'px';
        gameArea.style.height = windowHeight + 'px';
        gameArea.style.position = "absolute";
        gameArea.style.left = ((originalWindowWidth - windowWidth) / 2) + 'px';
        gameArea.style.top = ((originalWindowHeight - windowHeight) / 2) + 'px';
    }
    doc.addEventListener("onresize", rescale);
    doc.addEventListener("orientationchange", rescale);
    setInterval(rescale, 1000);
})(resizeGameAreaService || (resizeGameAreaService = {}));
;// This can't be a module, because we use it like:  translate(...) and not like translate.foobar(...)
function createTranslateService() {
    if (!angular) {
        throw new Error('You must first include angular: <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
    }
    var language;
    var codeToL10N;
    function translate(translationId, interpolateParams) {
        if (!codeToL10N) {
            throw new Error("You must call translate.setLanguagelang: string, codeToL10N: StringDictionary) before requesting translation of translationId=" + translationId);
        }
        var translation = codeToL10N[translationId];
        if (!translation) {
            translation = "[" + translationId + "]";
            log.error("Couldn't find translationId=" + translationId + " in language=" + language);
        }
        return $interpolate(translation)(interpolateParams || {});
    }
    var translateService;
    translateService = translate;
    translateService.getLanguage = function () { return language; };
    translateService.setLanguage = function (_language, _codeToL10N) {
        language = _language;
        codeToL10N = _codeToL10N;
    };
    return translateService;
}
var translate = createTranslateService();
angular.module('translate', [])
    .filter('translate', ['$parse', function ($parse) {
        'use strict';
        var translateFilter = function (translationId, interpolateParams) {
            if (!angular.isObject(interpolateParams)) {
                interpolateParams = $parse(interpolateParams)(this);
            }
            return translate(translationId, interpolateParams);
        };
        translateFilter.$stateful = true;
        return translateFilter;
    }]);
;// You use dragAndDropService like this:
// dragAndDropService.addDragListener(touchElementId, function handleDragEvent(type, clientX, clientY, event) {...});
// touchElementId can be "gameArea" (or any other element id).
// type is either: "touchstart", "touchmove", "touchend", "touchcancel", "touchleave"
var dragAndDropService;
(function (dragAndDropService) {
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
            console.log("handleDragEvent:", type, clientX, clientY);
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
    dragAndDropService.addDragListener = addDragListener;
})(dragAndDropService || (dragAndDropService = {}));
;var $rootScope;
var $location;
var $timeout;
var $interval;
var $interpolate;
angular.module('gameServices', ['translate'])
    .run(['$location', '$rootScope', '$timeout', '$interval', '$interpolate',
    function (_location, _rootScope, _timeout, _interval, _interpolate) {
        $location = _location;
        $rootScope = _rootScope;
        $timeout = _timeout;
        $interval = _interval;
        $interpolate = _interpolate;
        log.alwaysLog("Finished init of gameServices module; emulatorServicesCompilationDate=", emulatorServicesCompilationDate);
    }])
    .factory('$exceptionHandler', function () {
    function angularErrorHandler(exception, cause) {
        var errMsg = {
            gameUrl: '' + window.location,
            exception: "" + exception,
            stack: "" + (exception ? exception.stack : "no stack"),
            cause: cause,
            gameLogs: log.getLogs()
        };
        console.error("Game had an exception:\n", exception, " Full error message with logs: ", errMsg);
        window.alert("Game had an unexpected error. If you know JavaScript, you can look at the console and try to debug it :)");
        // To make sure students don't get:
        // Error: Uncaught DataCloneError: Failed to execute 'postMessage' on 'Window': An object could not be cloned.
        // I serialize to string and back.
        var plainPojoErr = angular.fromJson(angular.toJson(errMsg));
        window.parent.postMessage({ emailJavaScriptError: plainPojoErr }, "*");
    }
    window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
        angularErrorHandler(errorObj, 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
            ' Column: ' + column);
    };
    return angularErrorHandler;
});
