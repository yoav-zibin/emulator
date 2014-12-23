'use strict';

angular.module('myApp')
  .service('scaleViewportService', function($window, $log) {
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
      // The problem with innerWidth is that it changes when we set the initial-scale.
      var windowWidth = screen.availWidth; // window.innerWidth; // body.clientWidth
      var windowHeight = screen.availHeight; // window.innerHeight; // I saw cases where body.clientHeight was 0.
      
      // fix bug where width<height in landscape
      var isLandscape = window.orientation == -90 || window.orientation == 90;
      var didSwitch = false;
      if ((isLandscape && (windowWidth < windowHeight)) || (!isLandscape && (windowWidth > windowHeight))) {
        // switch
        didSwitch = true;
        var tmp = windowWidth;
        windowWidth = windowHeight;
        windowHeight = tmp;
      }
      
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

      var scaleX = windowWidth / myGameWidth;
      var scaleY = windowHeight / myGameHeight;
      var scale = round2(Math.min(scaleX, scaleY));
      var content = 'width=' + myGameWidth + ', height=' + myGameHeight + ', initial-scale=' + scale + ', minimum-scale=' + scale + ', maximum-scale=' + scale + ', user-scalable=no';
      var viewports = document.getElementsByName("viewport");
      var hasViewport = viewports && viewports.length > 0;
      $log.info(["windowWidth:", windowWidth, ' windowHeight:', windowHeight, ' scale:', scale, ' viewport content:', content, ' hasViewport:', hasViewport, ' didSwitch:', didSwitch]);
      if (hasViewport) {
        viewports[0].setAttribute("content", content);
      }
    }

    $window.onresize = rescale;
    $window.onorientationchange = rescale;
    doc.addEventListener("onresize", rescale);
    doc.addEventListener("orientationchange", rescale);
    setInterval(rescale, 1000);

    this.scaleBody = scaleBody;
  });
