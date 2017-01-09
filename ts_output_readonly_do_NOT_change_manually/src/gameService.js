var gamingPlatform;
(function (gamingPlatform) {
    var gameService;
    (function (gameService) {
        var isLocalTesting = window.parent === window;
        // UI for local testing
        var playersInCommunity = 5;
        gameService.playModes = ["passAndPlay", "playAgainstTheComputer", "onlyAIs", "multiplayer", "community"];
        gameService.playMode = "passAndPlay";
        gameService.supportedLanguages = [{ name: "English", code: "en" },
            { name: "עברית", code: "iw" },
            { name: "português", code: "pt" },
            { name: "中文", code: "zh" },
            { name: "ελληνικά", code: "el" },
            { name: "French", code: "fr" },
            { name: "हिन्दी", code: "hi" },
            { name: "español", code: "es" },
        ];
        gameService.currentLanguage = gameService.supportedLanguages[0];
        gameService.languageCode = "en";
        gameService.ogImageMaker = "https://dotted-guru-139914.appspot.com/";
        gameService.numberOfPlayers = 2;
        gameService.iframeRows = 1;
        gameService.iframeCols = 1;
        gameService.locationTrustedStr = null;
        var game;
        var playersInfo;
        gameService.history = [];
        gameService.historyIndex = 0;
        var playerIdToProposal = null;
        gameService.savedStates = [];
        gameService.selectedSavedStateToLoad = null;
        // test ogImage, getLogs, etc
        var testingHtml = "\n    <div style=\"position:absolute; width:100%; height:10%; overflow: scroll;\">\n      <select\n        ng-options=\"playMode for playMode in gameService.playModes track by playMode\"\n        ng-model=\"gameService.playMode\"\n        ng-change=\"gameService.reloadIframes()\"></select>\n      <button ng-click=\"gameService.startNewMatch()\">Start new match</button>\n      <select ng-change=\"gameService.historyIndexChanged()\" ng-model=\"gameService.historyIndex\" ng-options=\"index for index in gameService.getIntegersTill(gameService.history.length)\">\n        <option value=\"\">-- current move --</option>\n      </select>\n      <select ng-change=\"gameService.currentLanguageChanged()\" ng-model=\"gameService.currentLanguage\" ng-options=\"language.name for language in gameService.supportedLanguages\">\n        <option value=\"\">-- current game language --</option>\n      </select>\n      <button ng-click=\"gameService.saveState()\">Save match</button>\n      <select ng-change=\"gameService.loadMatch()\" ng-model=\"gameService.selectedSavedStateToLoad\" ng-options=\"savedState.name for savedState in gameService.savedStates\">\n        <option value=\"\">-- load match --</option>\n      </select>\n      <input ng-model=\"gameService.ogImageMaker\">\n      <button ng-click=\"gameService.getOgImageState()\">Open AppEngine image</button>\n    </div>\n    <div style=\"position:absolute; width:100%; height:90%; top: 10%;\">\n      <div ng-repeat=\"row in gameService.getIntegersTill(gameService.iframeRows)\"\n          style=\"position:absolute; top:{{row * 100 / gameService.iframeRows}}%; left:0; width:100%; height:{{100 / gameService.iframeRows}}%;\">\n        <div ng-repeat=\"col in gameService.getIntegersTill(gameService.iframeCols)\"\n            style=\"position:absolute; top:0; left:{{col * 100 / gameService.iframeCols}}%; width:{{100 / gameService.iframeCols}}%; height:100%;\">\n          <iframe id=\"game_iframe_{{col + row*gameService.iframeCols}}\"\n            ng-src=\"{{gameService.locationTrustedStr}}\"\n            seamless=\"seamless\" style=\"position:absolute; width:100%; height:100%;\">\n          </iframe>\n        </div>\n      </div>\n    </div>\n  ";
        var cacheIntegersTill = [];
        function getIntegersTill(number) {
            if (cacheIntegersTill[number])
                return cacheIntegersTill[number];
            var res = [];
            for (var i = 0; i < number; i++) {
                res.push(i);
            }
            cacheIntegersTill[number] = res;
            return res;
        }
        gameService.getIntegersTill = getIntegersTill;
        function clearState() {
            var state = {
                turnIndex: 0,
                endMatchScores: null,
                state: null,
            };
            gameService.history = [state];
            gameService.historyIndex = 0;
            playerIdToProposal = {};
        }
        gameService.clearState = clearState;
        function historyIndexChanged() {
            // angular makes historyIndex a string!
            gameService.historyIndex = Number(gameService.historyIndex);
            playerIdToProposal = {};
            reloadIframes();
        }
        gameService.historyIndexChanged = historyIndexChanged;
        function startNewMatch() {
            clearState();
            reloadIframes();
        }
        gameService.startNewMatch = startNewMatch;
        function sendSetLanguage(id) {
            passMessage({ setLanguage: { language: gameService.currentLanguage.code } }, id);
        }
        function currentLanguageChanged() {
            for (var r = 0; r < gameService.iframeRows; r++) {
                for (var c = 0; c < gameService.iframeCols; c++) {
                    var id = c + r * gameService.iframeCols;
                    sendSetLanguage(id);
                }
            }
        }
        gameService.currentLanguageChanged = currentLanguageChanged;
        function saveState() {
            var defaultStateName = "Saved state " + gameService.savedStates.length;
            var stateName = prompt("Please enter the state name", defaultStateName);
            if (!stateName)
                stateName = defaultStateName;
            gameService.savedStates.push({ name: stateName, playerIdToProposal: playerIdToProposal, history: gameService.history });
            localStorage.setItem("savedStates", angular.toJson(gameService.savedStates, true));
        }
        gameService.saveState = saveState;
        function loadMatch() {
            if (!gameService.selectedSavedStateToLoad)
                return;
            gameService.history = angular.copy(gameService.selectedSavedStateToLoad.history);
            gameService.historyIndex = gameService.history.length - 1;
            playerIdToProposal = angular.copy(gameService.selectedSavedStateToLoad.playerIdToProposal);
            gameService.selectedSavedStateToLoad = null;
            reloadIframes();
        }
        gameService.loadMatch = loadMatch;
        function loadSavedStates() {
            var savedStatesJson = localStorage.getItem("savedStates");
            if (savedStatesJson)
                gameService.savedStates = angular.fromJson(savedStatesJson);
        }
        function getOgImageState() {
            passMessage({ getStateForOgImage: true }, 0);
        }
        gameService.getOgImageState = getOgImageState;
        function reloadIframes() {
            gamingPlatform.log.log("reloadIframes: playMode=", gameService.playMode);
            setPlayersInfo();
            // Setting to 0 to force the game to send gameReady and then it will get the correct changeUI.
            gameService.iframeRows = 0;
            gameService.iframeCols = 0;
            gamingPlatform.$timeout(function () {
                if (gameService.playMode == "community") {
                    gameService.iframeRows = gameService.numberOfPlayers;
                    gameService.iframeCols = playersInCommunity;
                }
                else if (gameService.playMode == "multiplayer") {
                    gameService.iframeRows = 1;
                    gameService.iframeCols = gameService.numberOfPlayers + 1;
                }
                else {
                    gameService.iframeRows = 1;
                    gameService.iframeCols = 1;
                }
            });
        }
        gameService.reloadIframes = reloadIframes;
        function checkMove(move) {
            if (!move) {
                throw new Error("Game called makeMove with a null move=" + move);
            }
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
        gameService.checkMove = checkMove;
        function checkMakeMove(lastUpdateUI, move) {
            if (!lastUpdateUI) {
                throw new Error("Game called makeMove before getting updateUI or it called makeMove more than once for a single updateUI.");
            }
            var wasYourTurn = lastUpdateUI.turnIndex >= 0 &&
                lastUpdateUI.yourPlayerIndex === lastUpdateUI.turnIndex; // it's my turn
            if (!wasYourTurn) {
                throw new Error("Game called makeMove when it wasn't your turn: yourPlayerIndex=" + lastUpdateUI.yourPlayerIndex + " turnIndexAfterMove=" + lastUpdateUI.turnIndex);
            }
            checkMove(move);
        }
        function checkCommunityMove(lastCommunityUI, proposal, move) {
            if (!lastCommunityUI) {
                throw new Error("Don't call communityMove before getting communityUI.");
            }
            if (move) {
                checkMove(move);
            }
            var wasYourTurn = lastCommunityUI.turnIndex >= 0 &&
                lastCommunityUI.yourPlayerIndex === lastCommunityUI.turnIndex; // it's my turn
            if (!wasYourTurn) {
                throw new Error("Called communityMove when it wasn't your turn: yourPlayerIndex=" + lastCommunityUI.yourPlayerIndex + " turnIndexAfterMove=" + lastCommunityUI.turnIndex);
            }
            var oldProposal = lastCommunityUI.playerIdToProposal[lastCommunityUI.yourPlayerInfo.playerId];
            if (oldProposal) {
                throw new Error("Called communityMove when yourPlayerId already made a proposal, see: " + angular.toJson(oldProposal, true));
            }
        }
        function sendMessage(msg) {
            gamingPlatform.messageService.sendMessage(msg);
        }
        function setPlayersInfo() {
            playersInfo = [];
            for (var i = 0; i < gameService.numberOfPlayers; i++) {
                var playerId = gameService.playMode === "onlyAIs" ||
                    i !== 0 && gameService.playMode === "playAgainstTheComputer" ?
                    "" :
                    "" + (i + 42);
                playersInfo.push({ playerId: playerId, avatarImageUrl: null, displayName: null });
            }
        }
        function passMessage(msg, toIndex) {
            var iframe = window.document.getElementById("game_iframe_" + toIndex);
            iframe.contentWindow.postMessage(msg, "*");
        }
        function getIndexOfSource(src) {
            var i = 0;
            while (true) {
                var iframe = window.document.getElementById("game_iframe_" + i);
                if (!iframe) {
                    console.error("Can't find src=", src);
                    return -1;
                }
                if (iframe.contentWindow === src)
                    return i;
                i++;
            }
        }
        function overrideInnerHtml() {
            gamingPlatform.log.info("Overriding body's html");
            gameService.locationTrustedStr = gamingPlatform.$sce.trustAsResourceUrl(location.toString());
            var el = angular.element(testingHtml);
            window.document.body.innerHTML = '';
            angular.element(window.document.body).append(gamingPlatform.$compile(el)(gamingPlatform.$rootScope));
            window.addEventListener("message", function (event) {
                gamingPlatform.$rootScope.$apply(function () { return gotMessageFromGame(event); });
            });
        }
        function getState() {
            return gameService.history[gameService.historyIndex];
        }
        function getPlayerIndex(id) {
            if (gameService.playMode == "community") {
                // id = col + row*gameService.iframeCols;
                // iframeCols = playersInCommunity
                return Math.floor(id / gameService.iframeCols);
            }
            if (gameService.playMode == "multiplayer") {
                return id == gameService.numberOfPlayers ? -2 : id; // -2 is viewer
            }
            return getState().turnIndex;
        }
        function getChangeUI(id) {
            var index = getPlayerIndex(id);
            var state = getState();
            if (gameService.playMode == "community") {
                var communityUI = {
                    yourPlayerIndex: index,
                    yourPlayerInfo: {
                        avatarImageUrl: "",
                        displayName: "",
                        playerId: "playerId" + id,
                    },
                    playerIdToProposal: playerIdToProposal,
                    numberOfPlayers: gameService.numberOfPlayers,
                    state: state.state,
                    turnIndex: state.turnIndex,
                    endMatchScores: state.endMatchScores,
                };
                return { communityUI: communityUI };
            }
            var updateUI = {
                yourPlayerIndex: index,
                playersInfo: playersInfo,
                numberOfPlayers: gameService.numberOfPlayers,
                state: state.state,
                turnIndex: state.turnIndex,
                endMatchScores: state.endMatchScores,
                playMode: gameService.playMode == "multiplayer" ? index : gameService.playMode,
            };
            return { updateUI: updateUI };
        }
        function sendChangeUI(id) {
            passMessage(getChangeUI(id), id);
        }
        function getQueryString(params) {
            var res = [];
            for (var key in params) {
                var value = params[key];
                res.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
            }
            return res.join("&");
        }
        function getImageMakerUrl(stateStr) {
            var params = {};
            params["fbId0"] = "10153589934097337";
            params["fbId1"] = "10153693068502449";
            var state = getState();
            if (state.endMatchScores) {
                params["winner"] = state.endMatchScores[0] > state.endMatchScores[1] ? '0' : '1';
                ;
            }
            params["myIndex"] = '0';
            params["state"] = stateStr;
            return gameService.ogImageMaker + "?" + getQueryString(params);
        }
        function gotMessageFromGame(event) {
            var source = event.source;
            var id = getIndexOfSource(source);
            if (id == -1)
                return;
            var index = getPlayerIndex(id);
            var message = event.data;
            gamingPlatform.log.info("Platform got message", message);
            if (message.gameReady) {
                sendSetLanguage(id);
                sendChangeUI(id);
            }
            else if (message.sendStateForOgImage) {
                var imageMakerUrl = getImageMakerUrl(message.sendStateForOgImage);
                gamingPlatform.log.info(imageMakerUrl);
                window.open(imageMakerUrl, "_blank");
            }
            else {
                // Check last message
                var lastMessage = message.lastMessage;
                if (!angular.equals(lastMessage, getChangeUI(id))) {
                    console.warn("Ignoring message because message.lastMessage is wrong! This can happen if you play and immediately changed something like playMode. lastMessage=", lastMessage, " expected lastMessage=", getChangeUI(id));
                    return;
                }
                // Check move&prposal
                var move = message.move;
                var proposal = message.proposal;
                if (lastMessage.communityUI) {
                    checkCommunityMove(lastMessage.communityUI, proposal, move);
                }
                else {
                    checkMakeMove(lastMessage.updateUI, move);
                }
                if (index !== getState().turnIndex) {
                    throw new Error("Not your turn! yourPlayerIndex=" + index + " and the turn is of playerIndex=" + getState().turnIndex);
                }
                // Update state&proposals
                if (gameService.historyIndex != gameService.history.length - 1) {
                    // cut the future
                    gameService.history.splice(gameService.historyIndex + 1);
                    playerIdToProposal = {};
                }
                if (gameService.historyIndex != gameService.history.length - 1)
                    throw new Error("Internal err! historyIndex=" + gameService.historyIndex + " history.length=" + gameService.history.length);
                if (move) {
                    gameService.history.push(move);
                    gameService.historyIndex++;
                    playerIdToProposal = {};
                }
                else {
                    playerIdToProposal['playerId' + id] = proposal;
                }
                setTimeout(function () {
                    for (var r = 0; r < gameService.iframeRows; r++) {
                        for (var c = 0; c < gameService.iframeCols; c++) {
                            var id_1 = c + r * gameService.iframeCols;
                            sendChangeUI(id_1);
                        }
                    }
                }, 100);
            }
        }
        var lastChangeUiMessage = null;
        function communityMove(proposal, move) {
            checkCommunityMove(lastChangeUiMessage.communityUI, proposal, move);
            // I'm sending the move even in local testing to make sure it's simple json (or postMessage will fail).
            sendMessage({ proposal: proposal, move: move, lastMessage: lastChangeUiMessage });
            lastChangeUiMessage = null;
        }
        gameService.communityMove = communityMove;
        function makeMove(move) {
            checkMakeMove(lastChangeUiMessage.updateUI, move);
            // I'm sending the move even in local testing to make sure it's simple json (or postMessage will fail).
            sendMessage({ move: move, lastMessage: lastChangeUiMessage });
            lastChangeUiMessage = null; // to make sure you don't call makeMove until you get the next updateUI.
        }
        gameService.makeMove = makeMove;
        function callUpdateUI(updateUI) {
            lastChangeUiMessage = angular.copy({ updateUI: updateUI });
            game.updateUI(updateUI);
        }
        gameService.callUpdateUI = callUpdateUI;
        function callCommunityUI(communityUI) {
            lastChangeUiMessage = angular.copy({ communityUI: communityUI });
            game.communityUI(communityUI);
        }
        gameService.callCommunityUI = callCommunityUI;
        function gotMessageFromPlatform(message) {
            if (message.communityUI) {
                callCommunityUI(message.communityUI);
            }
            else if (message.updateUI) {
                callUpdateUI(message.updateUI);
            }
            else if (message.setLanguage) {
                gamingPlatform.translate.setLanguage(message.setLanguage.language);
            }
            else if (message.getGameLogs) {
                // To make sure students don't get:
                // Error: Uncaught DataCloneError: Failed to execute 'postMessage' on 'Window': An object could not be cloned.
                // I serialize to string and back.
                var plainPojoLogs = angular.fromJson(angular.toJson(gamingPlatform.log.getLogs()));
                setTimeout(function () {
                    sendMessage({ getGameLogsResult: plainPojoLogs });
                });
            }
            else if (message.getStateForOgImage) {
                sendMessage({ sendStateForOgImage: game.getStateForOgImage() });
            }
        }
        var didCallSetGame = false;
        function setGame(_game) {
            game = _game;
            setPlayersInfo();
            loadSavedStates();
            clearState();
            if (didCallSetGame) {
                throw new Error("You can call setGame exactly once!");
            }
            didCallSetGame = true;
            gamingPlatform.log.info("Called setGame");
            if (isLocalTesting) {
                gamingPlatform.$rootScope['gameService'] = gameService;
                gamingPlatform.$timeout(overrideInnerHtml, 50); // waiting a bit because the game might access the html (like boardArea) to listen to TouchEvents
            }
            else {
                gamingPlatform.messageService.addMessageListener(gotMessageFromPlatform);
            }
            // I wanted to delay sending gameReady until window.innerWidth and height are not 0,
            // but they will stay 0 (on ios) until we send gameReady (because platform will hide the iframe)
            sendMessage({ gameReady: "v4" });
            gamingPlatform.log.info("Calling 'fake' updateUI with yourPlayerIndex=-2 , meaning you're a viewer so you can't make a move");
            callUpdateUI({
                yourPlayerIndex: -2,
                playersInfo: playersInfo,
                numberOfPlayers: gameService.numberOfPlayers,
                state: null,
                turnIndex: 0,
                endMatchScores: null,
                playMode: "passAndPlay",
            });
        }
        gameService.setGame = setGame;
    })(gameService = gamingPlatform.gameService || (gamingPlatform.gameService = {}));
    var typeCheck_gameService = gameService;
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=gameService.js.map