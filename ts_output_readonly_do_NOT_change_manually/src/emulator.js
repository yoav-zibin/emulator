var gamingPlatform;
(function (gamingPlatform) {
    var emulator;
    (function (emulator) {
        // UI for local testing
        var playersInCommunity = 5;
        emulator.playModes = ["passAndPlay", "playAgainstTheComputer", "onlyAIs", "multiplayer", "community"];
        emulator.playMode = "passAndPlay";
        emulator.supportedLanguages = [{ name: "English", code: "en" },
            { name: "עברית", code: "iw" },
            { name: "português", code: "pt" },
            { name: "中文", code: "zh" },
            { name: "ελληνικά", code: "el" },
            { name: "French", code: "fr" },
            { name: "हिन्दी", code: "hi" },
            { name: "español", code: "es" },
        ];
        emulator.currentLanguage = emulator.supportedLanguages[0];
        emulator.languageCode = "en";
        emulator.ogImageMaker = "https://dotted-guru-139914.appspot.com/";
        emulator.numberOfPlayersRequiredToMove = 3; // for community matches.
        emulator.numberOfPlayers = 2;
        emulator.iframeRows = 1;
        emulator.iframeCols = 1;
        emulator.locationTrustedStr = null;
        var playersInfo;
        emulator.history = [];
        emulator.historyIndex = 0;
        var playerIdToProposal = null;
        emulator.savedStates = [];
        emulator.selectedSavedStateToLoad = null;
        emulator.showEnterJson = false;
        emulator.pastedUpdateUiJson = '{"state": null, "turnIndex": 0, "endMatchScores": null}';
        // TODO:
        // * move to iframe (so this html won't be affected by the game.css)
        // * test getLogs.
        var testingHtml = "\n    <style>\n    * {\n      font-size: 12px !important;\n      margin: 0px !important;\n      padding: 0px !important;\n    }\n    </style>\n    <div style=\"position:absolute; width:100%; height:10%; overflow: scroll;\">\n      <h4 ng-show=\"emulator.isGameOver()\">endMatchScores={{emulator.getState().endMatchScores}}</h4>\n      <select\n        ng-options=\"playMode for playMode in emulator.playModes track by playMode\"\n        ng-model=\"emulator.playMode\"\n        ng-change=\"emulator.reloadIframes()\"></select>\n      <button ng-click=\"emulator.startNewMatch()\">Start new match</button>\n      <select ng-change=\"emulator.historyIndexChanged()\" ng-model=\"emulator.historyIndex\" ng-options=\"index for index in emulator.getIntegersTill(emulator.history.length)\">\n        <option value=\"\">-- current move --</option>\n      </select>\n      <select ng-change=\"emulator.currentLanguageChanged()\" ng-model=\"emulator.currentLanguage\" ng-options=\"language.name for language in emulator.supportedLanguages\">\n        <option value=\"\">-- current game language --</option>\n      </select>\n      <button ng-click=\"emulator.saveState()\">Save match</button>\n      <select ng-change=\"emulator.loadMatch()\" ng-model=\"emulator.selectedSavedStateToLoad\" ng-options=\"savedState.name for savedState in emulator.savedStates\">\n        <option value=\"\">-- load match --</option>\n      </select>\n      <button ng-click=\"emulator.showEnterJson = true\">Load match from JSON</button>\n      <input ng-model=\"emulator.ogImageMaker\">\n      <button ng-click=\"emulator.getOgImageState()\">Open AppEngine image</button>\n      <div ng-show=\"emulator.playMode == 'community'\">\n        Number of players required to move in a community match: \n        <input ng-model=\"emulator.numberOfPlayersRequiredToMove\" \n          ng-change=\"emulator.resendUpdateUI()\">\n      </div>\n    </div>\n    <div ng-show=\"emulator.showEnterJson\" style=\"z-index:100; position:absolute; width:100%; height:90%; top:10%; overflow: scroll;\">\n      <textarea ng-model=\"emulator.pastedUpdateUiJson\" style=\"position:absolute; width:100%; height:90%;\"></textarea><br>\n      <button ng-click=\"emulator.loadMatchFromJson()\" style=\"position:absolute; width:100%; height:10%; top:90%;\">Load match from JSON</button>\n    </div>\n    <div style=\"position:absolute; width:100%; height:90%; top: 10%;\">\n      <div ng-repeat=\"row in emulator.getIntegersTill(emulator.iframeRows)\"\n          style=\"position:absolute; top:{{row * 100 / emulator.iframeRows}}%; left:0; width:100%; height:{{100 / emulator.iframeRows}}%;\">\n        <div ng-repeat=\"col in emulator.getIntegersTill(emulator.iframeCols)\"\n            style=\"position:absolute; top:0; left:{{col * 100 / emulator.iframeCols}}%; width:{{100 / emulator.iframeCols}}%; height:100%;\">\n          <iframe id=\"game_iframe_{{col + row*emulator.iframeCols}}\"\n            ng-src=\"{{emulator.locationTrustedStr}}\"\n            seamless=\"seamless\" style=\"position:absolute; width:100%; height:100%; left:0; top:0;\">\n          </iframe>\n        </div>\n      </div>\n    </div>\n  ";
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
        emulator.getIntegersTill = getIntegersTill;
        function clearState() {
            var state = {
                turnIndex: 0,
                endMatchScores: null,
                state: null,
            };
            emulator.history = [state];
            emulator.historyIndex = 0;
            playerIdToProposal = {};
        }
        emulator.clearState = clearState;
        function historyIndexChanged() {
            // angular makes historyIndex a string!
            emulator.historyIndex = Number(emulator.historyIndex);
            playerIdToProposal = {};
            resendUpdateUI();
        }
        emulator.historyIndexChanged = historyIndexChanged;
        function startNewMatch() {
            clearState();
            resendUpdateUI();
        }
        emulator.startNewMatch = startNewMatch;
        function sendSetLanguage(id) {
            passMessage({ setLanguage: { language: emulator.currentLanguage.code } }, id);
        }
        function currentLanguageChanged() {
            for (var r = 0; r < emulator.iframeRows; r++) {
                for (var c = 0; c < emulator.iframeCols; c++) {
                    var id = c + r * emulator.iframeCols;
                    sendSetLanguage(id);
                }
            }
        }
        emulator.currentLanguageChanged = currentLanguageChanged;
        function saveState() {
            var defaultStateName = "Saved state " + emulator.savedStates.length;
            var stateName = prompt("Please enter the state name", defaultStateName);
            if (!stateName)
                stateName = defaultStateName;
            emulator.savedStates.push({ name: stateName, playerIdToProposal: playerIdToProposal, history: emulator.history });
            localStorage.setItem("savedStates", angular.toJson(emulator.savedStates, true));
        }
        emulator.saveState = saveState;
        function loadMatchFromJson() {
            emulator.showEnterJson = false;
            var move = angular.fromJson(emulator.pastedUpdateUiJson);
            emulator.selectedSavedStateToLoad = {
                name: null, playerIdToProposal: null, history: [move]
            };
            loadMatch();
        }
        emulator.loadMatchFromJson = loadMatchFromJson;
        function loadMatch() {
            if (!emulator.selectedSavedStateToLoad)
                return;
            emulator.history = angular.copy(emulator.selectedSavedStateToLoad.history);
            emulator.historyIndex = emulator.history.length - 1;
            playerIdToProposal = angular.copy(emulator.selectedSavedStateToLoad.playerIdToProposal);
            emulator.selectedSavedStateToLoad = null;
            resendUpdateUI();
        }
        emulator.loadMatch = loadMatch;
        function loadSavedStates() {
            var savedStatesJson = localStorage.getItem("savedStates");
            if (savedStatesJson)
                emulator.savedStates = angular.fromJson(savedStatesJson);
        }
        function getOgImageState() {
            passMessage({ getStateForOgImage: true }, 0);
        }
        emulator.getOgImageState = getOgImageState;
        function resendUpdateUI() {
            // I want to avoid reloading the iframes (to be as close to the real platform as possible)
            for (var r = 0; r < emulator.iframeRows; r++) {
                for (var c = 0; c < emulator.iframeCols; c++) {
                    var id = c + r * emulator.iframeCols;
                    sendChangeUI(id);
                }
            }
        }
        emulator.resendUpdateUI = resendUpdateUI;
        function reloadIframes() {
            gamingPlatform.log.log("reloadIframes: playMode=", emulator.playMode);
            setPlayersInfo();
            // Setting to 0 to force the game to send gameReady and then it will get the correct changeUI.
            emulator.iframeRows = 0;
            emulator.iframeCols = 0;
            gamingPlatform.$timeout(function () {
                if (emulator.playMode == "community") {
                    emulator.iframeRows = emulator.numberOfPlayers;
                    emulator.iframeCols = playersInCommunity;
                }
                else if (emulator.playMode == "multiplayer") {
                    emulator.iframeRows = 1;
                    emulator.iframeCols = emulator.numberOfPlayers; // if I want to support a viewer, then add +1.
                }
                else {
                    emulator.iframeRows = 1;
                    emulator.iframeCols = 1;
                }
            });
        }
        emulator.reloadIframes = reloadIframes;
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
        emulator.checkMove = checkMove;
        function checkMakeMove(lastUpdateUI, move, proposal) {
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
            if (move) {
                checkMove(move);
            }
            if (proposal && !proposal.chatDescription) {
                throw new Error("You didn't set chatDescription in your proposal=" + angular.toJson(proposal, true));
            }
        }
        function setPlayersInfo() {
            playersInfo = [];
            for (var i = 0; i < emulator.numberOfPlayers; i++) {
                var playerId = emulator.playMode === "onlyAIs" ||
                    i !== 0 && emulator.playMode === "playAgainstTheComputer" ?
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
            gamingPlatform.$rootScope['emulator'] = emulator;
            setPlayersInfo();
            loadSavedStates();
            clearState();
            emulator.locationTrustedStr = gamingPlatform.$sce.trustAsResourceUrl(location.toString());
            var el = angular.element(testingHtml);
            window.document.body.innerHTML = '';
            angular.element(window.document.body).append(gamingPlatform.$compile(el)(gamingPlatform.$rootScope));
            window.addEventListener("message", function (event) {
                gamingPlatform.$rootScope.$apply(function () { return gotMessageFromGame(event); });
            });
        }
        emulator.overrideInnerHtml = overrideInnerHtml;
        function isGameOver() {
            return !!getState().endMatchScores;
        }
        emulator.isGameOver = isGameOver;
        function getState() {
            return emulator.history[emulator.historyIndex];
        }
        emulator.getState = getState;
        function getPlayerIndex(id) {
            if (emulator.playMode == "community") {
                // id = col + row*emulator.iframeCols;
                // iframeCols = playersInCommunity
                return Math.floor(id / emulator.iframeCols);
            }
            if (emulator.playMode == "multiplayer") {
                return id == emulator.numberOfPlayers ? -2 : id; // -2 is viewer
            }
            return getState().turnIndex;
        }
        function getUpdateUI(id) {
            var index = getPlayerIndex(id);
            var state = getState();
            var isCommunity = emulator.playMode == "community";
            var updateUI = {
                // community matches
                numberOfPlayersRequiredToMove: isCommunity ? emulator.numberOfPlayersRequiredToMove : null,
                playerIdToProposal: isCommunity ? playerIdToProposal : null,
                yourPlayerIndex: index,
                yourPlayerInfo: {
                    avatarImageUrl: "",
                    displayName: "",
                    playerId: "playerId" + id,
                },
                playersInfo: playersInfo,
                numberOfPlayers: emulator.numberOfPlayers,
                state: state.state,
                turnIndex: state.turnIndex,
                endMatchScores: state.endMatchScores,
                playMode: emulator.playMode == "multiplayer" || isCommunity ? index : emulator.playMode,
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
            return emulator.ogImageMaker + "?" + getQueryString(params);
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
                var lastUpdateUI = message.lastMessage.updateUI;
                if (!angular.equals(lastUpdateUI, getUpdateUI(id))) {
                    console.warn("Ignoring message because message.lastMessage is wrong! This can happen if you play and immediately changed something like playMode. lastMessage.updateUI=", lastUpdateUI, " expected=", getUpdateUI(id));
                    return;
                }
                // Check move&proposal
                var move = message.move;
                var proposal = message.proposal;
                checkMakeMove(lastUpdateUI, move, proposal);
                if (index !== getState().turnIndex) {
                    throw new Error("Not your turn! yourPlayerIndex=" + index + " and the turn is of playerIndex=" + getState().turnIndex);
                }
                // Update state&proposals
                if (emulator.historyIndex != emulator.history.length - 1) {
                    // cut the future
                    emulator.history.splice(emulator.historyIndex + 1);
                    playerIdToProposal = {};
                }
                if (emulator.historyIndex != emulator.history.length - 1)
                    throw new Error("Internal err! historyIndex=" + emulator.historyIndex + " history.length=" + emulator.history.length);
                if (move) {
                    emulator.history.push(move);
                    emulator.historyIndex++;
                    playerIdToProposal = {};
                }
                else {
                    playerIdToProposal['playerId' + id] = proposal;
                }
                setTimeout(resendUpdateUI, 100);
            }
        }
    })(emulator = gamingPlatform.emulator || (gamingPlatform.emulator = {}));
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=emulator.js.map