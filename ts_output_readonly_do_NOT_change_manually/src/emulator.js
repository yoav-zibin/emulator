var gamingPlatform;
(function (gamingPlatform) {
    var emulator;
    (function (emulator) {
        emulator.iframeRows = 0;
        emulator.iframeCols = 0;
        emulator.locationTrustedStr = null;
        // TODO:
        // * test getLogs.
        var testingHtml = "\n    <div style=\"position:absolute; width:100%; height:10%; overflow: scroll;\">\n      <iframe id=\"emulator_top_iframe\"\n        src=\"https://yoav-zibin.github.io/emulator/emulatorTopIframe.html\"\n        seamless=\"seamless\" style=\"position:absolute; width:100%; height:100%; left:0; top:0;\">\n      </iframe>\n    </div>\n    <div style=\"position:absolute; width:100%; height:90%; top: 10%;\">\n      <div ng-repeat=\"row in emulator.getIntegersTill(emulator.iframeRows)\"\n          style=\"position:absolute; top:{{row * 100 / emulator.iframeRows}}%; left:0; width:100%; height:{{100 / emulator.iframeRows}}%;\">\n        <div ng-repeat=\"col in emulator.getIntegersTill(emulator.iframeCols)\"\n            style=\"position:absolute; top:0; left:{{col * 100 / emulator.iframeCols}}%; width:{{100 / emulator.iframeCols}}%; height:100%;\">\n          <iframe id=\"game_iframe_{{col + row*emulator.iframeCols}}\"\n            ng-src=\"{{emulator.locationTrustedStr}}\"\n            seamless=\"seamless\" style=\"position:absolute; width:100%; height:100%; left:0; top:0;\">\n          </iframe>\n        </div>\n      </div>\n    </div>\n  ";
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
        function reloadIframes(newRows, newCols) {
            gamingPlatform.log.log("reloadIframes");
            // Setting to 0 to force the game to send gameReady and then it will get the correct changeUI.
            emulator.iframeRows = 0;
            emulator.iframeCols = 0;
            gamingPlatform.$timeout(function () {
                emulator.iframeRows = newRows;
                emulator.iframeCols = newCols;
            });
        }
        emulator.reloadIframes = reloadIframes;
        function getIframe(id) {
            var iframe = window.document.getElementById(id);
            if (!iframe) {
                console.error("Can't find src=", id);
                return null;
            }
            return iframe.contentWindow;
        }
        function getTopIframe() {
            return getIframe("emulator_top_iframe");
        }
        function getGameIframe(id) {
            return getIframe("game_iframe_" + id);
        }
        function passMessage(msg, toIndex) {
            getGameIframe(toIndex).postMessage(msg, "*");
        }
        function getIndexOfSource(src) {
            var i = 0;
            while (i < 50) {
                var game_iframe = getGameIframe(i);
                if (game_iframe === src)
                    return i;
                if (!game_iframe)
                    break;
                i++;
            }
            console.error("getIndexOfSource src=", src, " didn't find the matching iframe!");
        }
        function overrideInnerHtml() {
            gamingPlatform.log.info("Overriding body's html");
            gamingPlatform.$rootScope['emulator'] = emulator;
            emulator.locationTrustedStr = gamingPlatform.$sce.trustAsResourceUrl(location.toString());
            var el = angular.element(testingHtml);
            // Hide all elements in body.
            for (var child = window.document.body.firstChild; child; child = child.nextSibling) {
                // We also get some #text DOM nodes that don't have a .style attribute.
                if (child.style)
                    child.style.display = "none";
            }
            angular.element(window.document.body).append(gamingPlatform.$compile(el)(gamingPlatform.$rootScope));
            window.addEventListener("message", function (event) {
                gamingPlatform.$rootScope.$apply(function () { return gotMessageFromGame(event); });
            });
        }
        emulator.overrideInnerHtml = overrideInnerHtml;
        function gotMessageFromTopIframe(data) {
            if (data.toGameMessage) {
                passMessage(data.toGameMessage, data.toGameIframeId);
            }
            else {
                reloadIframes(data.rows, data.cols);
            }
        }
        function gotMessageFromGame(event) {
            var source = event.source;
            if (getTopIframe() === source) {
                gotMessageFromTopIframe(event.data);
                return;
            }
            var id = getIndexOfSource(source);
            if (id == -1)
                return;
            var message = event.data;
            var toTopIframe = { fromGameMessage: message, gameIframeId: id };
            getTopIframe().postMessage(toTopIframe, "*");
        }
    })(emulator = gamingPlatform.emulator || (gamingPlatform.emulator = {}));
})(gamingPlatform || (gamingPlatform = {}));
//# sourceMappingURL=emulator.js.map