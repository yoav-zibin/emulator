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
        gameService.playMode = emulator.playMode;
        log.info("Emulator playMode=", emulator.playMode, " minPlayersNum=", emulator.minPlayersNum, "maxPlayersNum=", emulator.maxPlayersNum);
        gameService.setGame({
            minNumberOfPlayers: emulator.minPlayersNum,
            maxNumberOfPlayers: emulator.maxPlayersNum,
            isMoveOk: isMoveOk,
            updateUI: updateUI
        });
        window.addEventListener("message", function (event) {
            var message = event.data;
            log.info("Emulator got message from game: ", message);
            $rootScope.$apply(function () {
                // Ignoring: setLanguageResult, gameReady
                if (message.isMoveOkResult !== undefined) {
                    if (!message.isMoveOkResult) {
                        alert("isMoveOk return false!");
                    }
                }
                else if (message.makeMove) {
                    emulator.lastMove = angular.toJson(message.makeMove, true);
                    gameService.makeMove(message.makeMove);
                }
            });
        }, false);
    }
    emulator.setGame = setGame;
    function passMessage(msg) {
        log.info("Emulator sent to game: ", msg);
        var iframe = window.document.getElementById("game_iframe");
        iframe.contentWindow.postMessage(msg, "*");
    }
})(emulator || (emulator = {}));
angular.module('myApp', ['gameServices']).run(function ($sce) {
    log.info("Loaded emulator");
    $rootScope['emulator'] = emulator;
    emulator.$sce = $sce;
});
