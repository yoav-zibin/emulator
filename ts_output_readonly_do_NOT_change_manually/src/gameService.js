var gamingPlatform;
(function (gamingPlatform) {
    var gameService;
    (function (gameService) {
        var isLocalTesting = window.parent === window;
        var game;
        function checkMove(move) {
            // Do some checks: turnIndexAfterMove is -1 iff endMatchScores is not null.
            var noTurnIndexAfterMove = move.turnIndex === -1;
            var hasEndMatchScores = !!move.endMatchScores;
            if (noTurnIndexAfterMove && !hasEndMatchScores) {
                throw new Error("Illegal move: turnIndexAfterMove was -1 but you forgot to set endMatchScores. Move=" +
                    angular.toJson(move, true));
            }
            if (hasEndMatchScores && !noTurnIndexAfterMove) {
                throw new Error("Illegal move: you set endMatchScores but you didn't set turnIndexAfterMove to -1. Move=" +
                    angular.toJson(move, true));
            }
        }
        function checkMakeMove(lastUpdateUI, move, proposal, chatDescription) {
            if (!lastUpdateUI) {
                throw new Error("Game called makeMove before getting updateUI or it called makeMove more than once for a single updateUI.");
            }
            var wasYourTurn = lastUpdateUI.turnIndex >= 0 &&
                lastUpdateUI.yourPlayerIndex === lastUpdateUI.turnIndex; // it's my turn
            if (!wasYourTurn) {
                throw new Error("Game called makeMove when it wasn't your turn: yourPlayerIndex=" + lastUpdateUI.yourPlayerIndex + " turnIndexAfterMove=" + lastUpdateUI.turnIndex);
            }
            if (lastUpdateUI.playerIdToProposal) {
                var oldProposal = lastUpdateUI.playerIdToProposal[lastUpdateUI.yourPlayerInfo.playerId];
                if (oldProposal) {
                    throw new Error("Called communityMove when yourPlayerId already made a proposal, see: " + angular.toJson(oldProposal, true));
                }
            }
            if (!move && !proposal) {
                throw new Error("Game called makeMove with a null move=" + move + " and null proposal=" + proposal);
            }
            if (!move && !lastUpdateUI.playerIdToProposal) {
                throw new Error("Game called makeMove with a null move=" + move);
            }
            if (move)
                checkMove(move);
            if (!chatDescription) {
                console.error("You didn't set chatDescription in your makeMove! Please copy http://yoav-zibin.github.io/emulator/dist/turnBasedServices.4.js into your lib/turnBasedServices.4.js , and http://yoav-zibin.github.io/emulator/src/multiplayer-games.d.ts into your typings/multiplayer-games.d.ts , and make sure you pass chatDescription as the last argument to gameService.makeMove(move, proposal, chatDescription)");
            }
        }
        gameService.checkMakeMove = checkMakeMove;
        function sendMessage(msg) {
            // To make sure students don't get:
            // Error: Uncaught DataCloneError: Failed to execute 'postMessage' on 'Window': An object could not be cloned.
            // I serialize to string and back.
            // This also removes any $$hashkey that the game may have added:
            // http://stackoverflow.com/questions/18826320/what-is-the-hashkey-added-to-my-json-stringify-result
            var plainPojoMsg = angular.fromJson(angular.toJson(msg));
            gamingPlatform.messageService.sendMessage(plainPojoMsg);
        }
        function passMessage(msg, toIndex) {
            var iframe = window.document.getElementById("game_iframe_" + toIndex);
            iframe.contentWindow.postMessage(msg, "*");
        }
        var lastUpdateUiMessage = null;
        function makeMove(move, proposal, chatDescription) {
            checkMakeMove(lastUpdateUiMessage, move, proposal, chatDescription);
            sendMessage({ move: move, proposal: proposal, chatDescription: chatDescription, lastMessage: { updateUI: lastUpdateUiMessage } });
            lastUpdateUiMessage = null; // to make sure you don't call makeMove until you get the next updateUI.
        }
        gameService.makeMove = makeMove;
        function callUpdateUI(updateUI) {
            lastUpdateUiMessage = angular.copy(updateUI);
            game.updateUI(updateUI);
        }
        gameService.callUpdateUI = callUpdateUI;
        function gotMessageFromPlatform(message) {
            if (message.updateUI) {
                callUpdateUI(message.updateUI);
            }
            else if (message.setLanguage) {
                gamingPlatform.translate.setLanguage(message.setLanguage.language);
            }
            else if (message.getGameLogs) {
                setTimeout(function () {
                    sendMessage({ getGameLogsResult: gamingPlatform.log.getLogs() });
                });
            }
            else if (message.evalJsCode) {
                eval(message.evalJsCode);
            }
        }
        function createScriptWithCrossorigin(id, src) {
            gamingPlatform.log.info("Loading script ", src, " into script element with id=", id);
            if (document.getElementById(id)) {
                gamingPlatform.log.error("Already loaded src=", src);
                return;
            }
            var js = document.createElement('script');
            js.src = src;
            js.id = id;
            js.onload = function () {
                gamingPlatform.log.info("Loaded script ", src);
                gamingPlatform.emulator.overrideInnerHtml();
            };
            js.async = 1;
            js.crossorigin = "anonymous";
            var fjs = document.getElementsByTagName('script')[0];
            fjs.parentNode.insertBefore(js, fjs);
        }
        var didCallSetGame = false;
        function setGame(_game) {
            game = _game;
            if (didCallSetGame) {
                throw new Error("You can call setGame exactly once!");
            }
            didCallSetGame = true;
            gamingPlatform.log.info("Called setGame");
            if (isLocalTesting) {
                // waiting a bit because the game might access the html (like boardArea) to listen to TouchEvents
                gamingPlatform.$timeout(function () {
                    if (gamingPlatform.emulator) {
                        gamingPlatform.emulator.overrideInnerHtml();
                    }
                    else {
                        createScriptWithCrossorigin("emulator", "https://yoav-zibin.github.io/emulator/ts_output_readonly_do_NOT_change_manually/src/emulator.js");
                    }
                }, 50);
            }
            else {
                gamingPlatform.messageService.addMessageListener(gotMessageFromPlatform);
            }
            // I wanted to delay sending gameReady until window.innerWidth and height are not 0,
            // but they will stay 0 (on ios) until we send gameReady (because platform will hide the iframe)
            sendMessage({ gameReady: "v4" });
            gamingPlatform.log.info("Calling 'fake' updateUI with yourPlayerIndex=-2 , meaning you're a viewer so you can't make a move");
            var playerInfo = { playerId: '', avatarImageUrl: null, displayName: null };
            callUpdateUI({
                numberOfPlayersRequiredToMove: null,
                playerIdToProposal: null,
                yourPlayerIndex: -2,
                yourPlayerInfo: playerInfo,
                playersInfo: [playerInfo, playerInfo],
                numberOfPlayers: 2,
                state: null,
                turnIndex: 0,
                endMatchScores: null,
                playMode: "passAndPlay",
                matchType: "passAndPlay",
            });
        }
        gameService.setGame = setGame;
    })(gameService = gamingPlatform.gameService || (gamingPlatform.gameService = {}));
    var typeCheck_gameService = gameService;
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=gameService.js.map