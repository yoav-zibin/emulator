var gamingPlatform;
(function (gamingPlatform) {
    var resizeGameAreaService;
    (function (resizeGameAreaService) {
        var widthToHeight = null;
        var dimensionsChanged = null;
        var oldSizes = null;
        var doc = window.document;
        var gameArea;
        function setWidthToHeight(_widthToHeight, _dimensionsChanged) {
            gamingPlatform.log.info("setWidthToHeight to ", _widthToHeight);
            widthToHeight = _widthToHeight;
            dimensionsChanged = _dimensionsChanged;
            gameArea = doc.getElementById('gameArea');
            if (!gameArea) {
                throw new Error("You forgot to add to your <body> this div: <div id='gameArea'>...</div>");
            }
            oldSizes = null;
            rescale();
            // on iOS there was a bug, if you clicked on a ycheckers notification (when app was killed)
            // then you would miss the animation (because width&height are initially 0, so it took a second to be shown).
            // So I added these timeouts.
            // we usually call setWidthToHeight and gameService.setGame (which sends gameReady) together,
            // so the iframe will be visilble very soon...
            setTimeout(rescale, 10);
            setTimeout(rescale, 100);
            setTimeout(rescale, 500);
        }
        resizeGameAreaService.setWidthToHeight = setWidthToHeight;
        function round2(num) {
            return Math.round(num * 100) / 100;
        }
        function rescale() {
            if (widthToHeight === null) {
                return;
            }
            var originalWindowWidth = window.innerWidth; // doc.body.clientWidth
            var originalWindowHeight = window.innerHeight; // I saw cases where doc.body.clientHeight was 0.
            var windowWidth = originalWindowWidth;
            var windowHeight = originalWindowHeight;
            if (oldSizes !== null) {
                if (oldSizes.windowWidth === windowWidth &&
                    oldSizes.windowHeight === windowHeight) {
                    return; // nothing changed, so no need to change the transformations.
                }
            }
            if (windowWidth === 0 || windowHeight === 0) {
                gamingPlatform.log.info("Window width/height is 0 so hiding gameArea div.");
                gameArea.style.display = "none";
                return;
            }
            gameArea.style.display = "block";
            gamingPlatform.$rootScope.$apply(function () {
                oldSizes = {
                    windowWidth: windowWidth,
                    windowHeight: windowHeight
                };
                var newWidthToHeight = windowWidth / windowHeight;
                if (newWidthToHeight > widthToHeight) {
                    windowWidth = round2(windowHeight * widthToHeight);
                }
                else {
                    windowHeight = round2(windowWidth / widthToHeight);
                }
                gamingPlatform.log.info("Window size is " + oldSizes.windowWidth + "x" + oldSizes.windowHeight +
                    " so setting gameArea size to " + windowWidth + "x" + windowHeight +
                    " because widthToHeight=" + widthToHeight);
                // Take 5% margin (so the game won't touch the end of the screen)
                var keepMargin = 0.95;
                windowWidth *= keepMargin;
                windowHeight *= keepMargin;
                gameArea.style.width = windowWidth + 'px';
                gameArea.style.height = windowHeight + 'px';
                gameArea.style.position = "absolute";
                gameArea.style.left = ((originalWindowWidth - windowWidth) / 2) + 'px';
                gameArea.style.top = ((originalWindowHeight - windowHeight) / 2) + 'px';
                if (dimensionsChanged)
                    dimensionsChanged(windowWidth, windowHeight);
            });
        }
        doc.addEventListener("onresize", rescale);
        doc.addEventListener("orientationchange", rescale);
        setInterval(rescale, 1000);
    })(resizeGameAreaService = gamingPlatform.resizeGameAreaService || (gamingPlatform.resizeGameAreaService = {}));
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=resizeGameAreaService.js.map