var gamingPlatform;
(function (gamingPlatform) {
    var emulator;
    (function (emulator) {
        emulator.playModes = ['passAndPlay', 'playAgainstTheComputer'];
        emulator.playMode = emulator.playModes[0];
        emulator.url = "http://yoav-zibin.github.io/TicTacToe/index.html";
        emulator.minPlayersNum = 2;
        emulator.maxPlayersNum = 2;
        emulator.calledSetGame = false;
        function updateUI(params) {
            passMessage({ updateUI: params });
            emulator.lastUpdateUI = angular.toJson(params, true);
        }
        function isMoveOk(params) {
            passMessage({ isMoveOk: params });
            emulator.lastIsMoveOk = angular.toJson(params, true);
            return true;
        }
        function sendUpdateUI() {
            passMessage({ updateUI: angular.fromJson(emulator.lastUpdateUI) });
        }
        emulator.sendUpdateUI = sendUpdateUI;
        function sendIsMoveOk() {
            passMessage({ isMoveOk: angular.fromJson(emulator.lastIsMoveOk) });
        }
        emulator.sendIsMoveOk = sendIsMoveOk;
        function getUrl() {
            return emulator.$sce.trustAsResourceUrl(emulator.url);
        }
        emulator.getUrl = getUrl;
        function setGame() {
            if (emulator.calledSetGame) {
                return;
            }
            emulator.calledSetGame = true;
            gamingPlatform.gameService.playMode = emulator.playMode;
            gamingPlatform.log.info("Emulator playMode=", emulator.playMode, " minPlayersNum=", emulator.minPlayersNum, "maxPlayersNum=", emulator.maxPlayersNum);
            gamingPlatform.gameService.setGame({
                minNumberOfPlayers: emulator.minPlayersNum,
                maxNumberOfPlayers: emulator.maxPlayersNum,
                isMoveOk: isMoveOk,
                updateUI: updateUI,
                gotMessageFromPlatform: null,
                getStateForOgImage: null,
            });
            window.addEventListener("message", function (event) {
                var message = event.data;
                gamingPlatform.log.info("Emulator got message from game: ", message);
                gamingPlatform.$rootScope.$apply(function () {
                    // Ignoring: setLanguageResult, gameReady
                    if (message.isMoveOkResult !== undefined) {
                        if (!message.isMoveOkResult) {
                            alert("isMoveOk return false!");
                        }
                    }
                    else if (message.makeMove) {
                        emulator.lastMove = angular.toJson(message.makeMove, true);
                        gamingPlatform.gameService.makeMove(message.makeMove);
                    }
                });
            }, false);
        }
        emulator.setGame = setGame;
        function passMessage(msg) {
            gamingPlatform.log.info("Emulator sent to game: ", msg);
            var iframe = window.document.getElementById("game_iframe");
            iframe.contentWindow.postMessage(msg, "*");
        }
    })(emulator = gamingPlatform.emulator || (gamingPlatform.emulator = {}));
    angular.module('myApp', ['gameServices']).run(function ($sce) {
        gamingPlatform.log.info("Loaded emulator");
        gamingPlatform.$rootScope['emulator'] = emulator;
        emulator.$sce = $sce;
    });
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=emulator.js.map