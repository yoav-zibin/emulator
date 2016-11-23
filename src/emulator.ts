namespace gamingPlatform {

export module emulator {
  export let playModes = ['passAndPlay', 'multiplayer', 'playAgainstTheComputer', 'community'];
  export let playMode = playModes[0];
  export let url: string = "http://yoav-zibin.github.io/TicTacToe/index.html";
  export let minPlayersNum: number = 2;
  export let maxPlayersNum: number = 2;

  export let lastUpdateUI: string;
  export let lastIsMoveOk: string;
  export let lastMove: string;
  export let $sce: angular.ISCEService;
  export let calledSetGame = false;

  function updateUI(params: IUpdateUI) {
    passMessage({updateUI: params});
    lastUpdateUI = angular.toJson(params, true);
  }

  function isMoveOk(params: IIsMoveOk) {
    passMessage({isMoveOk: params});
    lastIsMoveOk = angular.toJson(params, true);
    return true;
  }

  export function sendUpdateUI() {
    passMessage({updateUI: angular.fromJson(lastUpdateUI)});
  }
  export function sendIsMoveOk() {
    passMessage({isMoveOk: angular.fromJson(lastIsMoveOk)});
  }
  export function getUrl() {
    return $sce.trustAsResourceUrl(url);
  }

  export function setGame() {
    if (calledSetGame) {
      return;
    }
    calledSetGame = true;
    gameService.playMode = playMode;
    log.info("Emulator playMode=", playMode, " minPlayersNum=", minPlayersNum , "maxPlayersNum=", maxPlayersNum);
    gameService.setGame({
      minNumberOfPlayers: minPlayersNum,
      maxNumberOfPlayers: maxPlayersNum,
      isMoveOk: isMoveOk,
      updateUI: updateUI,
      gotMessageFromPlatform: null,
      getStateForOgImage: null,
      communityUI: null,
    });
    window.addEventListener("message", function (event) {
      let message = event.data;
      log.info("Emulator got message from game: ", message);
      $rootScope.$apply(function () {
        // Ignoring: setLanguageResult, gameReady
        if (message.isMoveOkResult !== undefined) {
          if (!message.isMoveOkResult) {
            alert("isMoveOk return false!");
          }
        } else if (message.makeMove) {
          lastMove = angular.toJson(message.makeMove, true);
          gameService.makeMove(message.makeMove);
        }
      });
    }, false);
  }

  function passMessage(msg: any): void {
    log.info("Emulator sent to game: ", msg);
    let iframe = <HTMLIFrameElement> window.document.getElementById("game_iframe");
    iframe.contentWindow.postMessage(msg, "*");
  }
}

angular.module('myApp', ['gameServices']).run(function ($sce: angular.ISCEService) {
  log.info("Loaded emulator");
  $rootScope['emulator'] = emulator;
  emulator.$sce = $sce;
});

}
