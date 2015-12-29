namespace gamingPlatform {

interface ResizeMapAreaParams {
  imageId: string;
  mapId: string;
  originalWidth: number;
  originalHeight: number;
}
export function resizeMapArea(params: ResizeMapAreaParams): void {
  let imageId = params.imageId;
  let mapId = params.mapId;
  let originalWidth = params.originalWidth;
  let originalHeight = params.originalHeight;

  function rescale() {
    let image = <HTMLImageElement>document.getElementById(imageId);
    let map = document.getElementById(mapId);
    let widthScale = image.width / originalWidth;
    let heightScale = image.height / originalHeight;
    //console.log("widthScale=", widthScale, "heightScale=", heightScale);
    let areaElements = map.getElementsByTagName("area");
    for (let areaIndex = 0; areaIndex < areaElements.length; areaIndex++) {
      let areaElement = areaElements[areaIndex];
      let originalCoords = areaElement.getAttribute("data-original-coords");
      if (!originalCoords) {
        areaElement.setAttribute("data-original-coords", areaElement.getAttribute("coords"));
      }
      let coords: string[] = areaElement.getAttribute("data-original-coords").split(',');
      let coordsPercent: number[] = [];
      for (let i = 0; i < coords.length; ++i) {
        let coordNum = Number(coords[i]);
        if (i % 2 === 0) {
          coordsPercent[i] = Math.round(coordNum * widthScale);
        } else {
          coordsPercent[i] = Math.round(coordNum * heightScale);
        }
      }
      //console.log("before=", coords, "after=", coordsPercent);
      areaElement.setAttribute("coords", coordsPercent.toString());
    }
  }
  document.addEventListener("onresize", rescale);
  document.addEventListener("orientationchange", rescale);
  setInterval(rescale, 1000);
}

}
