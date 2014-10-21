'use strict';

angular.module('myApp')
  .service('scaleBodyService', function($window, $log) {
    var doc = $window.document;
    var gameSize = null;
    var oldSizes = null;

    function scaleBody(_gameSize) {
      gameSize = _gameSize;
      rescale();
    }
    function round2(num) {
      return Math.round(num * 100) / 100;
    }

    function rescale() {
      var body = doc.body;
      if (gameSize === null) {
        return;
      }
      var myGameWidth = gameSize.width;
      var myGameHeight = gameSize.height;
      var windowWidth = $window.innerWidth; // body.clientWidt
      var windowHeight = $window.innerHeight; // I saw cases where body.clientHeight was 0.
      if (oldSizes !== null) {
        if (oldSizes.myGameWidth === myGameWidth &&
            oldSizes.myGameHeight === myGameHeight &&
            oldSizes.windowWidth === windowWidth &&
            oldSizes.windowHeight === windowHeight) {
          return; // nothing changed, so no need to change the transformations.
        }
      }
      oldSizes = {
          myGameWidth: myGameWidth,
          myGameHeight: myGameHeight,
          windowWidth: windowWidth,
          windowHeight: windowHeight
      };
      $log.info(["Scaling the body to size: ", oldSizes]);

      var scaleX = windowWidth / myGameWidth;
      var scaleY = windowHeight / myGameHeight;
      var scale = round2(Math.min(scaleX, scaleY));
      var tx = round2((windowWidth / scale - myGameWidth) / 2);
      var ty = round2((windowHeight / scale - myGameHeight) / 2);
      var transformString = "scale(" + scale + "," + scale + ")  translate(" + tx + "px, " + ty + "px)";
      body.style['transform'] = transformString;
      body.style['-o-transform'] = transformString;
      body.style['-webkit-transform'] = transformString;
      body.style['-moz-transform'] = transformString;
      body.style['-ms-transform'] = transformString;
      var transformOriginString = "top left";
      body.style['transform-origin'] = transformOriginString;
      body.style['-o-transform-origin'] = transformOriginString;
      body.style['-webkit-transform-origin'] = transformOriginString;
      body.style['-moz-transform-origin'] = transformOriginString;
      body.style['-ms-transform-origin'] = transformOriginString;
    }

    $window.onresize = rescale;
    $window.onorientationchange = rescale;
    doc.addEventListener("orientationchange", rescale);
    setInterval(rescale, 1000);

    this.scaleBody = scaleBody;
  });
