var gamingPlatform;
(function (gamingPlatform) {
    var messageService;
    (function (messageService) {
        var gameUrl = location.toString();
        function sendMessage(message) {
            gamingPlatform.log.info("Game sent message", message);
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
                gamingPlatform.log.info("Game got message", message);
                gamingPlatform.$rootScope.$apply(function () {
                    listener(message);
                });
            }, false);
        }
        messageService.addMessageListener = addMessageListener;
        ;
    })(messageService = gamingPlatform.messageService || (gamingPlatform.messageService = {}));
})(gamingPlatform || (gamingPlatform = {}));
