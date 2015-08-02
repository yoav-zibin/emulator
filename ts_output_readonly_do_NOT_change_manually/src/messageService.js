var messageService;
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
