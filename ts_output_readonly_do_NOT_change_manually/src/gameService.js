var gamingPlatform;
(function (gamingPlatform) {
    var gameService;
    (function (gameService) {
        var isLocalTesting = window.parent === window ||
            window.location.search === "?test";
        gameService.playMode = location.search.indexOf("onlyAIs") !== -1 ? "onlyAIs"
            : location.search.indexOf("playAgainstTheComputer") !== -1 ? "playAgainstTheComputer"
                : location.search.indexOf("?playMode=") === 0 ? location.search.substr("?playMode=".length)
                    : "passAndPlay"; // Default play mode
        // We verify that you call makeMove at most once for every updateUI (and only when it's your turn)
        var lastUpdateUI = null;
        var game;
        function updateUI(params) {
            lastUpdateUI = angular.copy(params);
            game.updateUI(params);
        }
        gameService.updateUI = updateUI;
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
            if (isLocalTesting) {
                // I'm using $timeout so it will be more like production (where we use postMessage),
                // so the updateUI response is not sent immediately).
                gamingPlatform.$timeout(function () {
                    gamingPlatform.stateService.makeMove(move);
                }, 10);
            }
            else {
                gamingPlatform.messageService.sendMessage({ makeMove: move, lastUpdateUI: lastUpdateUI });
            }
            lastUpdateUI = null; // to make sure you don't call makeMove until you get the next updateUI.
        }
        gameService.makeMove = makeMove;
        function getPlayers() {
            var playersInfo = [];
            var actualNumberOfPlayers = gamingPlatform.stateService.randomFromTo(game.minNumberOfPlayers, game.maxNumberOfPlayers + 1);
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
        var w = window;
        function setGame(_game) {
            game = _game;
            if (didCallSetGame) {
                throw new Error("You can call setGame exactly once!");
            }
            didCallSetGame = true;
            var playersInfo = getPlayers();
            if (isLocalTesting) {
                if (w.game) {
                    w.game.isHelpModalShown = true;
                }
                gamingPlatform.stateService.setGame({ updateUI: updateUI, isMoveOk: game.isMoveOk });
                gamingPlatform.stateService.initNewMatch();
                gamingPlatform.stateService.setPlayMode(gameService.playMode);
                gamingPlatform.stateService.setPlayers(playersInfo);
                gamingPlatform.stateService.sendUpdateUi();
            }
            else {
                gamingPlatform.messageService.addMessageListener(function (message) {
                    if (message.isMoveOk) {
                        var isMoveOkResult = game.isMoveOk(message.isMoveOk);
                        if (isMoveOkResult !== true) {
                            isMoveOkResult = { result: isMoveOkResult, isMoveOk: message.isMoveOk };
                        }
                        gamingPlatform.messageService.sendMessage({ isMoveOkResult: isMoveOkResult });
                    }
                    else if (message.updateUI) {
                        updateUI(message.updateUI);
                    }
                    else if (message.setLanguage) {
                        gamingPlatform.translate.setLanguage(message.setLanguage.language, message.setLanguage.codeToL10N);
                        // we need to ack this message to the platform so the platform will make the game-iframe visible
                        // (The platform waited until the game got the l10n.)
                        // Using setTimeout to give time for angular to refresh it's UI (the default was in English)
                        setTimeout(function () {
                            gamingPlatform.messageService.sendMessage({ setLanguageResult: true });
                        });
                    }
                    else if (message.getGameLogs) {
                        // To make sure students don't get:
                        // Error: Uncaught DataCloneError: Failed to execute 'postMessage' on 'Window': An object could not be cloned.
                        // I serialize to string and back.
                        var plainPojoLogs = angular.fromJson(angular.toJson(gamingPlatform.log.getLogs()));
                        setTimeout(function () {
                            gamingPlatform.messageService.sendMessage({ getGameLogsResult: plainPojoLogs });
                        });
                    }
                    else if (message.passMessageToGame) {
                        var msgFromPlatform = message.passMessageToGame;
                        if (msgFromPlatform.SHOW_GAME_INSTRUCTIONS && w.game) {
                            w.game.isHelpModalShown = !w.game.isHelpModalShown;
                        }
                        if (game.gotMessageFromPlatform)
                            game.gotMessageFromPlatform(msgFromPlatform);
                    }
                });
                gamingPlatform.messageService.sendMessage({ gameReady: {} });
            }
            // Show an empty board to a viewer (so you can't perform moves).
            gamingPlatform.log.info("Passing a 'fake' updateUI message in order to show an empty board to a viewer (so you can NOT perform moves)");
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
    })(gameService = gamingPlatform.gameService || (gamingPlatform.gameService = {}));
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=gameService.js.map