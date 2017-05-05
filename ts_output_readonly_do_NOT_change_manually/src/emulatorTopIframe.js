var gamingPlatform;
(function (gamingPlatform) {
    var emulatorTopIframe;
    (function (emulatorTopIframe) {
        emulatorTopIframe.iframeRows = 1;
        emulatorTopIframe.iframeCols = 1;
        // UI for local testing
        var playersInCommunity = 5;
        emulatorTopIframe.playModes = ["passAndPlay", "playAgainstTheComputer", "onlyAIs",
            "pingPongMultiplayer", "speedMultiplayer", "community"];
        emulatorTopIframe.playMode = "passAndPlay";
        function isPassAndPlay() {
            return emulatorTopIframe.playMode == "passAndPlay";
        }
        function isPlayAgainstTheComputer() {
            return emulatorTopIframe.playMode == "playAgainstTheComputer";
        }
        function isOnlyAIs() {
            return emulatorTopIframe.playMode == "onlyAIs";
        }
        function isCommunity() {
            return emulatorTopIframe.playMode == "community";
        }
        function isMultiplayer() {
            return emulatorTopIframe.playMode == "speedMultiplayer" || emulatorTopIframe.playMode == "pingPongMultiplayer";
        }
        function isSpeedMultiplayer() {
            return emulatorTopIframe.playMode == "speedMultiplayer";
        }
        function isPingPongMultiplayer() {
            return emulatorTopIframe.playMode == "pingPongMultiplayer";
        }
        emulatorTopIframe.supportedLanguages = [{ name: "English", code: "en" },
            { name: "עברית", code: "iw" },
            { name: "português", code: "pt" },
            { name: "中文", code: "zh" },
            { name: "ελληνικά", code: "el" },
            { name: "French", code: "fr" },
            { name: "हिन्दी", code: "hi" },
            { name: "español", code: "es" },
        ];
        emulatorTopIframe.currentLanguage = emulatorTopIframe.supportedLanguages[0];
        emulatorTopIframe.languageCode = "en";
        emulatorTopIframe.ogImageMaker = "https://dotted-guru-139914.appspot.com/";
        emulatorTopIframe.numberOfPlayersRequiredToMove = 3; // for community matches.
        emulatorTopIframe.numberOfPlayers = 2;
        var playersInfo;
        emulatorTopIframe.history = [];
        emulatorTopIframe.historyIndex = 0;
        var playerIdToProposal = null;
        emulatorTopIframe.savedStates = [];
        emulatorTopIframe.selectedSavedStateToLoad = null;
        emulatorTopIframe.showEnterJson = false;
        emulatorTopIframe.pastedUpdateUiJson = '{"state": null, "turnIndex": 0, "endMatchScores": null}';
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
        emulatorTopIframe.getIntegersTill = getIntegersTill;
        function clearState() {
            var state = {
                turnIndex: 0,
                endMatchScores: null,
                state: null,
            };
            emulatorTopIframe.history = [state];
            emulatorTopIframe.historyIndex = 0;
            playerIdToProposal = {};
        }
        emulatorTopIframe.clearState = clearState;
        function historyIndexChanged() {
            // angular makes historyIndex a string!
            emulatorTopIframe.historyIndex = Number(emulatorTopIframe.historyIndex);
            playerIdToProposal = {};
            resendUpdateUI();
        }
        emulatorTopIframe.historyIndexChanged = historyIndexChanged;
        function startNewMatch() {
            clearState();
            resendUpdateUI();
        }
        emulatorTopIframe.startNewMatch = startNewMatch;
        function sendSetLanguage(id) {
            passMessage({ setLanguage: { language: emulatorTopIframe.currentLanguage.code } }, id);
        }
        function currentLanguageChanged() {
            for (var r = 0; r < emulatorTopIframe.iframeRows; r++) {
                for (var c = 0; c < emulatorTopIframe.iframeCols; c++) {
                    var id = c + r * emulatorTopIframe.iframeCols;
                    sendSetLanguage(id);
                }
            }
        }
        emulatorTopIframe.currentLanguageChanged = currentLanguageChanged;
        function saveState() {
            var defaultStateName = "Saved state " + emulatorTopIframe.savedStates.length;
            var stateName = prompt("Please enter the state name", defaultStateName);
            if (!stateName)
                stateName = defaultStateName;
            emulatorTopIframe.savedStates.push({ name: stateName, playerIdToProposal: playerIdToProposal, history: emulatorTopIframe.history });
            localStorage.setItem("savedStates", angular.toJson(emulatorTopIframe.savedStates, true));
        }
        emulatorTopIframe.saveState = saveState;
        function loadMatchFromJson() {
            emulatorTopIframe.showEnterJson = false;
            var move = angular.fromJson(emulatorTopIframe.pastedUpdateUiJson);
            emulatorTopIframe.selectedSavedStateToLoad = {
                name: null, playerIdToProposal: null, history: [move]
            };
            loadMatch();
        }
        emulatorTopIframe.loadMatchFromJson = loadMatchFromJson;
        function loadMatch() {
            if (!emulatorTopIframe.selectedSavedStateToLoad)
                return;
            emulatorTopIframe.history = angular.copy(emulatorTopIframe.selectedSavedStateToLoad.history);
            emulatorTopIframe.historyIndex = emulatorTopIframe.history.length - 1;
            playerIdToProposal = angular.copy(emulatorTopIframe.selectedSavedStateToLoad.playerIdToProposal);
            emulatorTopIframe.selectedSavedStateToLoad = null;
            resendUpdateUI();
        }
        emulatorTopIframe.loadMatch = loadMatch;
        function loadSavedStates() {
            var savedStatesJson = localStorage.getItem("savedStates");
            if (savedStatesJson)
                emulatorTopIframe.savedStates = angular.fromJson(savedStatesJson);
        }
        function getOgImageState() {
            passMessage({ getStateForOgImage: true }, 0);
        }
        emulatorTopIframe.getOgImageState = getOgImageState;
        function resendUpdateUI() {
            // I want to avoid reloading the iframes (to be as close to the real platform as possible)
            for (var r = 0; r < emulatorTopIframe.iframeRows; r++) {
                for (var c = 0; c < emulatorTopIframe.iframeCols; c++) {
                    var id = c + r * emulatorTopIframe.iframeCols;
                    sendChangeUI(id);
                }
            }
        }
        emulatorTopIframe.resendUpdateUI = resendUpdateUI;
        function resendUpdateUIRespectingPingPong() {
            if (!isPingPongMultiplayer() || emulatorTopIframe.historyIndex == 0) {
                resendUpdateUI();
                return;
            }
            // In ping pong, I want to be careful to only send updateUI to opponent if the turn changed.
            var currState = getState();
            var prevState = emulatorTopIframe.history[emulatorTopIframe.historyIndex - 1];
            if (prevState.turnIndex != currState.turnIndex) {
                resendUpdateUI();
                return;
            }
            sendChangeUI(currState.turnIndex);
        }
        emulatorTopIframe.resendUpdateUIRespectingPingPong = resendUpdateUIRespectingPingPong;
        function reloadIframes() {
            console.info("reloadIframes: playMode=", emulatorTopIframe.playMode);
            setPlayersInfo();
            if (isCommunity()) {
                emulatorTopIframe.iframeRows = emulatorTopIframe.numberOfPlayers;
                emulatorTopIframe.iframeCols = playersInCommunity;
            }
            else if (isMultiplayer()) {
                emulatorTopIframe.iframeRows = 1;
                emulatorTopIframe.iframeCols = emulatorTopIframe.numberOfPlayers + 1; // if I want to support a viewer, then add +1.
            }
            else {
                emulatorTopIframe.iframeRows = 1;
                emulatorTopIframe.iframeCols = 1;
            }
            var message = {
                toGameIframeId: null, toGameMessage: null,
                rows: emulatorTopIframe.iframeRows, cols: emulatorTopIframe.iframeCols
            };
            passMessageToParent(message);
        }
        emulatorTopIframe.reloadIframes = reloadIframes;
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
        emulatorTopIframe.checkMove = checkMove;
        var UNKNOWN_AVATAR = "https://yoav-zibin.github.io/emulator/imgs/autoMatchAvatar.png";
        function setPlayersInfo() {
            playersInfo = [];
            for (var i = 0; i < emulatorTopIframe.numberOfPlayers; i++) {
                var playerId = isOnlyAIs() ||
                    i !== 0 && isPlayAgainstTheComputer() ?
                    "" :
                    "" + (i + 42);
                playersInfo.push({ playerId: playerId, avatarImageUrl: UNKNOWN_AVATAR, displayName: null });
            }
        }
        function passMessage(msg, toIndex) {
            var message = {
                toGameIframeId: toIndex, toGameMessage: msg,
                rows: null, cols: null
            };
            passMessageToParent(message);
        }
        function passMessageToParent(message) {
            console.info("Debug info: topIframe to platform sending: ", message);
            window.parent.postMessage(message, "*");
        }
        function init($rootScope) {
            console.info("TopIframe init");
            if (window.parent == window) {
                alert("This page can only be used from within another game");
                return;
            }
            $rootScope['emulator'] = emulatorTopIframe;
            causeLaginess();
            setPlayersInfo();
            loadSavedStates();
            clearState();
            window.addEventListener("message", function (event) {
                $rootScope.$apply(function () { return gotMessageFromGame(event); });
            });
            reloadIframes();
        }
        emulatorTopIframe.init = init;
        function causeLaginess() {
            console.info("causeLaginess on purpose for 500 ms");
            // Some games use animations and guess when they end using $timeout, so I introduce
            // laginess on purpose to make it more like the real platform.
            setInterval(function () {
                // just take the CPU for 80ms.
                var start = new Date().getTime();
                while (new Date().getTime() - start < 500) { }
            }, 600);
        }
        function isGameOver() {
            return !!getState().endMatchScores;
        }
        emulatorTopIframe.isGameOver = isGameOver;
        function getState() {
            return emulatorTopIframe.history[emulatorTopIframe.historyIndex];
        }
        emulatorTopIframe.getState = getState;
        function getPlayerIndex(id) {
            if (isCommunity()) {
                // id = col + row*emulator.iframeCols;
                // iframeCols = playersInCommunity
                return Math.floor(id / emulatorTopIframe.iframeCols);
            }
            if (isMultiplayer()) {
                return id == emulatorTopIframe.numberOfPlayers ? -2 : id; // -2 is viewer
            }
            return getState().turnIndex;
        }
        function getUpdateUI(id) {
            var index = getPlayerIndex(id);
            var state = getState();
            var updateUI = {
                // community matches
                numberOfPlayersRequiredToMove: isCommunity() ? emulatorTopIframe.numberOfPlayersRequiredToMove : null,
                playerIdToProposal: isCommunity() ? playerIdToProposal : null,
                yourPlayerIndex: index,
                yourPlayerInfo: index >= 0 ? playersInfo[index] : {
                    avatarImageUrl: UNKNOWN_AVATAR,
                    displayName: "Yoyo",
                    playerId: "playerId" + id,
                },
                playersInfo: playersInfo,
                numberOfPlayers: emulatorTopIframe.numberOfPlayers,
                state: state.state,
                turnIndex: state.turnIndex,
                endMatchScores: state.endMatchScores,
                playMode: isMultiplayer() || isCommunity() ? index : emulatorTopIframe.playMode,
                matchType: emulatorTopIframe.playMode,
            };
            return updateUI;
        }
        function sendChangeUI(id) {
            passMessage({ updateUI: getUpdateUI(id) }, id);
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
            return emulatorTopIframe.ogImageMaker + "?" + getQueryString(params);
        }
        function gotMessageFromGame(event) {
            var data = event.data;
            console.info("Debug info: topIframe got from platform: ", data);
            var id = data.gameIframeId;
            var index = getPlayerIndex(id);
            var message = data.fromGameMessage;
            console.info("Platform got message", message);
            if (message.gameReady) {
                sendSetLanguage(id);
                sendChangeUI(id);
            }
            else if (message.sendStateForOgImage) {
                var imageMakerUrl = getImageMakerUrl(message.sendStateForOgImage);
                console.info(imageMakerUrl);
                window.open(imageMakerUrl, "_blank");
            }
            else {
                // Check last message
                var lastUpdateUI = message.lastMessage.updateUI;
                if (!angular.equals(lastUpdateUI, getUpdateUI(id))) {
                    console.warn("Ignoring message because message.lastMessage is wrong! This can happen if you play and immediately changed something like playMode. lastMessage.updateUI=", lastUpdateUI, " expected=", getUpdateUI(id));
                    return;
                }
                // Check move&proposal
                var move = message.move;
                var proposal = message.proposal;
                gamingPlatform.gameService.checkMakeMove(lastUpdateUI, move, proposal, message.chatDescription);
                if (index !== getState().turnIndex) {
                    throw new Error("Not your turn! yourPlayerIndex=" + index + " and the turn is of playerIndex=" + getState().turnIndex);
                }
                // Update state&proposals
                if (emulatorTopIframe.historyIndex != emulatorTopIframe.history.length - 1) {
                    // cut the future
                    emulatorTopIframe.history.splice(emulatorTopIframe.historyIndex + 1);
                    playerIdToProposal = {};
                }
                if (emulatorTopIframe.historyIndex != emulatorTopIframe.history.length - 1)
                    throw new Error("Internal err! historyIndex=" + emulatorTopIframe.historyIndex + " history.length=" + emulatorTopIframe.history.length);
                if (move) {
                    emulatorTopIframe.history.push(move);
                    emulatorTopIframe.historyIndex++;
                    playerIdToProposal = {};
                }
                else {
                    playerIdToProposal['playerId' + id] = proposal;
                }
                setTimeout(resendUpdateUIRespectingPingPong, 100);
            }
        }
    })(emulatorTopIframe = gamingPlatform.emulatorTopIframe || (gamingPlatform.emulatorTopIframe = {}));
    angular.module('myApp', [])
        .run(['$rootScope',
        function ($rootScope) {
            emulatorTopIframe.init($rootScope);
        }]);
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=emulatorTopIframe.js.map