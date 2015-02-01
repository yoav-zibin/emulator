'use strict';

angular.module('myApp')
  .service('resizeGameAreaService', function($window, $log) {
    var doc = $window.document;
    var widthToHeight = null;
    var oldSizes = null;

    function setWidthToHeight(_widthToHeight) {
      widthToHeight = _widthToHeight;
      rescale();
    }
    function round2(num) {
      return Math.round(num * 100) / 100;
    }

    function rescale() {
      if (widthToHeight === null) {
        return;
      }
      var body = doc.body;
      var windowWidth = $window.innerWidth; // body.clientWidth
      var windowHeight = $window.innerHeight; // I saw cases where body.clientHeight was 0.
      if (oldSizes !== null) {
        if (oldSizes.windowWidth === windowWidth &&
            oldSizes.windowHeight === windowHeight) {
          return; // nothing changed, so no need to change the transformations.
        }
      }
      oldSizes = {
          windowWidth: windowWidth,
          windowHeight: windowHeight
      };
      var gameArea = doc.getElementById('gameArea');
      if (windowWidth === 0 || windowHeight === 0) {
      $log.info("Window width/height is 0 so hiding gameArea div.");
        gameArea.style.display = "none";
        return;
      }
      gameArea.style.display = "block";

      var newWidthToHeight = windowWidth / windowHeight;

      if (newWidthToHeight > widthToHeight) {
        windowWidth = windowHeight * widthToHeight;
        gameArea.style.height = windowHeight + 'px';
        gameArea.style.width = windowWidth + 'px';
      } else {
        windowHeight = windowWidth / widthToHeight;
        gameArea.style.width = windowWidth + 'px';
        gameArea.style.height = windowHeight + 'px';
      }
      $log.info("Window size is " + oldSizes.windowWidth + "x" + oldSizes.windowHeight
          + " so setting gameArea size to " + windowWidth + "x" + windowHeight
          + " because widthToHeight=" + widthToHeight);

      gameArea.style.marginTop = (-windowHeight / 2) + 'px';
      gameArea.style.marginLeft = (-windowWidth / 2) + 'px';
      gameArea.style.position = "absolute";
      gameArea.style.left = "50%";
      gameArea.style.top = "50%";
    }

    $window.onresize = rescale;
    $window.onorientationchange = rescale;
    doc.addEventListener("onresize", rescale);
    doc.addEventListener("orientationchange", rescale);
    setInterval(rescale, 1000);

    this.setWidthToHeight = setWidthToHeight;
  });
