namespace gamingPlatform {

export module messageService {
  let gameUrl = location.toString();
  export function sendMessage(message: any) {
    log.info("Game sent message", message);
    message.gameUrl = gameUrl;
    window.parent.postMessage(message, "*");
  };
  export function addMessageListener(listener: (message: any) => void) {
    window.addEventListener("message", function (event) {
      let source = event.source;
      if (source !== window.parent) {
        return;
      }
      let message = event.data;
      log.info("Game got message", message);
      $rootScope.$apply(function () {
        listener(message);
      });
    }, false);
  };
}

}
