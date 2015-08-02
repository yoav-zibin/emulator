"use strict"; var emulatorServicesCompilationDate = "Sun Aug 2 15:05:43 EDT 2015";
;function createUrlParams() {
    var query = location.search.substr(1);
    var result = {};
    query.split("&").forEach(function (part) {
        var item = part.split("=");
        result[item[0]] = decodeURIComponent(item[1]);
    });
    return result;
}
var urlParams = createUrlParams();
;var log;
(function (log_1) {
    var alwaysLogs = [];
    var lastLogs = [];
    var startTime = getCurrentTime();
    function getCurrentTime() {
        return window.performance ? window.performance.now() : new Date().getTime();
    }
    log_1.getCurrentTime = getCurrentTime;
    function getLogEntry(args) {
        return { time: getCurrentTime() - startTime, args: args };
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
                    stringArg = JSON.stringify(arg);
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
    log_1.getLogs = getLogs;
    function alwaysLog() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        alwaysLogs.push(getLogEntry(args));
        console.info.apply(console, args);
    }
    log_1.alwaysLog = alwaysLog;
    function info() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.info.apply(console, args);
    }
    log_1.info = info;
    function debug() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.debug.apply(console, args);
    }
    log_1.debug = debug;
    function warn() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.warn.apply(console, args);
    }
    log_1.warn = warn;
    function error() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.error.apply(console, args);
    }
    log_1.error = error;
    function log() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        storeLog(args);
        console.log.apply(console, args);
    }
    log_1.log = log;
})(log || (log = {}));
;var myStorage;
(function (myStorage) {
    function makeShort(str) {
        return str && str.length > 25 ? str.substring(0, 20) + " ..." : str;
    }
    function getItem(key) {
        if (!window.localStorage) {
            return null;
        }
        var stringValue = window.localStorage.getItem(key);
        log.info("myStorage.getItem(", key, ") returned ", makeShort(stringValue));
        return stringValue ? angular.fromJson(stringValue) : null;
    }
    myStorage.getItem = getItem;
    function setItem(key, value) {
        if (!value) {
            throw new Error("Doesn't make sense to store null in myStorage!");
        }
        if (window.localStorage) {
            var stringValue = angular.toJson(value);
            log.info("myStorage.setItem(", key, ",", makeShort(stringValue), ")");
            window.localStorage.setItem(key, stringValue);
        }
    }
    myStorage.setItem = setItem;
})(myStorage || (myStorage = {}));
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
        for (var k = 0; k < move.length; k++) {
            var operation = move[k];
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
        var moveForIndex = getMoveForPlayerIndex(turnIndex, lastMove);
        var stateBeforeMove = getStateForPlayerIndex(turnIndex, lastState, lastVisibleTo);
        var stateAfterMove = getStateForPlayerIndex(turnIndex, currentState, currentVisibleTo);
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
            yourPlayerIndex: getYourPlayerIndex(),
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
        for (var i = 0; i < operations.length; i++) {
            processApiOperation(operations[i]);
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
    var playMode = location.search === "?onlyAIs" ? "onlyAIs"
        : location.search === "?playAgainstTheComputer" ? "playAgainstTheComputer" : "passAndPlay"; // Default play mode
    // We verify that you call makeMove at most once for every updateUI (and only when it's your turn)
    var lastUpdateUI = null;
    var game;
    function updateUI(params) {
        lastUpdateUI = params;
        game.updateUI(params);
    }
    function makeMove(move) {
        log.info(["Making move:", move]);
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
            var playerId = playMode === "onlyAIs" ||
                i !== 0 && playMode === "playAgainstTheComputer" ?
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
            stateService.setPlayMode(playMode);
            stateService.setPlayers(playersInfo);
            stateService.setGame({ updateUI: updateUI, isMoveOk: game.isMoveOk });
        }
        else {
            var isMoveOk = game.isMoveOk;
            var updateUI = game.updateUI;
            messageService.addMessageListener(function (message) {
                gameService.lastMessage = message;
                if (message.isMoveOk !== undefined) {
                    var isMoveOkResult = isMoveOk(message.isMoveOk);
                    if (isMoveOkResult !== true) {
                        isMoveOkResult = { result: isMoveOkResult, isMoveOk: message.isMoveOk };
                    }
                    messageService.sendMessage({ isMoveOkResult: isMoveOkResult });
                }
                else if (message.updateUI !== undefined) {
                    lastUpdateUI = message.updateUI;
                    updateUI(message.updateUI);
                }
            });
            messageService.sendMessage({ gameReady: {} });
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
    }
    gameService.setGame = setGame;
})(gameService || (gameService = {}));
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
    alphaBetaService.alphaBetaDecision = alphaBetaDecision;
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
            logSaver.info("Window width/height is 0 so hiding gameArea div.");
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
        logSaver.info("Window size is " + oldSizes.windowWidth + "x" + oldSizes.windowHeight +
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
;// This can't be a module, because we use it like:  $translate(...) and not like $translate.foobar(...)
function createTranslateService() {
    if (!angular) {
        throw new Error('You must first include angular: <script src="http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js"></script>');
    }
    if (!angular.isArray(window.angularTranslationLanguages)) {
        return null; // you don't have to use I18N :)
    }
    var $availableLanguageKeys = window.angularTranslationLanguages;
    // tries to determine the browsers language
    function getFirstBrowserLanguage() {
        var nav = window.navigator, browserLanguagePropertyKeys = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'], i, language;
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
        var avail = [], locale = angular.lowercase(preferred), i = 0, n = $availableLanguageKeys.length;
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
    function getLanguage() {
        var lang = urlParams.lang;
        var locale = lang ? lang : getLocale();
        var language = negotiateLocale(locale);
        if ($availableLanguageKeys.indexOf(language) === -1) {
            throw new Error("YOAV: the selected language (" + language + ") must be in $availableLanguageKeys=" + $availableLanguageKeys);
        }
        return language;
    }
    var language = getLanguage();
    if (!language) {
        throw new Error("You must include angularTranslate like this:\n" +
            '<script>\n' +
            "window.angularTranslationLanguages = ['en', ...];\n" +
            '</script>\n' +
            '<script src="http://yoav-zibin.github.io/emulator/angular-translate/angular-translate.min.js"></script>\n');
    }
    console.log("Language is " + language);
    var angularTranslations = myStorage.getItem(language);
    window.angularTranslationsLoaded = function (lang, codeToL10N) {
        console.log("angularTranslationsLoaded called with language=" + lang);
        angularTranslations = codeToL10N;
        myStorage.setItem(language, angularTranslations);
    };
    // Do not add "crossorigin='anonymous'" because it will prevent local testing.
    var script = "<script src='languages/" + language + ".js'></script>"; // It will block, thus preventing angular to start before the translations are loaded.
    document.write(script); // jshint ignore:line
    function translate(translationId, interpolateParams) {
        if (!angularTranslations) {
            throw new Error("Couldn't load language=" + language + " neither from the internet nor from localStorage");
        }
        var translation = angularTranslations[translationId];
        if (!translation) {
            throw new Error("Couldn't find translationId=" + translationId + " in language=" + language);
        }
        return $interpolate(translation)(interpolateParams || {});
    }
    var translateService;
    translateService = translate;
    translateService.getLanguage = function () { return language; };
    return translateService;
}
var $translate = createTranslateService(); // uses urlParams.lang
angular.module('myApp')
    .filter('translate', ['$parse', function ($parse) {
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
angular.module('myApp')
    .service('initGameServices', ['$location', '$rootScope', '$timeout', '$interval', '$interpolate',
    function (_location, _rootScope, _timeout, _interval, _interpolate) {
        $location = _location;
        $rootScope = _rootScope;
        $timeout = _timeout;
        $interval = _interval;
        $interpolate = _interpolate;
    }])
    .factory('$exceptionHandler', function () {
    function angularErrorHandler(exception, cause) {
        var lines = [];
        lines.push("Game URL: " + window.location);
        lines.push("exception: " + exception);
        lines.push("stackTrace: " + (exception && exception.stack ? exception.stack.replace(/\n/g, "\n\t") : "no stack trace :("));
        lines.push("cause: " + cause);
        lines.push("Last message: " + JSON.stringify(gameService.lastMessage));
        lines.push("Game logs: " + log.getLogs().replace(/\n/g, "\n\t"));
        var errStr = lines.join("\n\t");
        console.error("Game had an exception:\n", errStr);
        window.parent.postMessage({ emailJavaScriptError: errStr }, "*");
    }
    window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
        angularErrorHandler(errorObj, 'Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber +
            ' Column: ' + column);
    };
    return angularErrorHandler;
});
