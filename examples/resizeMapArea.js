function resizeMapArea(params) {
  'use strict';
  
  var imageId = params.imageId;
  var mapId = params.mapId;
  var originalWidth = params.originalWidth;
  var originalHeight = params.originalHeight;

  function rescale() {
    var image = document.getElementById(imageId);
    var map = document.getElementById(mapId);
    var widthScale = image.width / originalWidth;
    var heightScale = image.height / originalHeight;
    //console.log("widthScale=", widthScale, "heightScale=", heightScale);
    var areaElements = map.getElementsByTagName("area");
    for (var areaIndex = 0; areaIndex < areaElements.length; areaIndex++) {
      var areaElement = areaElements[areaIndex];
      var originalCoords = areaElement.getAttribute("data-original-coords");
      if (!originalCoords) {
        areaElement.setAttribute("data-original-coords", areaElement.getAttribute("coords"));
      }
      var coords = areaElement.getAttribute("data-original-coords").split(',');
      var coordsPercent = [];
      for (var i = 0; i < coords.length; ++i) {
        if (i % 2 === 0)
          coordsPercent[i] = Math.round(coords[i] * widthScale);
        else
          coordsPercent[i] = Math.round(coords[i] * heightScale);
      }
      //console.log("before=", coords, "after=", coordsPercent);
      areaElement.setAttribute("coords", coordsPercent.toString());
    }
  }
  document.addEventListener("onresize", rescale);
  document.addEventListener("orientationchange", rescale);
  setInterval(rescale, 1000);
}
