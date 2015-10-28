module resizeGameAreaService {
  interface WindowSize {
    windowWidth: number;
    windowHeight: number;
  }
  let widthToHeight: number = null;
  let oldSizes: WindowSize = null;
  let doc = window.document;
  let gameArea: HTMLElement;

  export function setWidthToHeight(_widthToHeight: number): void {
    widthToHeight = _widthToHeight;
    gameArea = doc.getElementById('gameArea');
    if (!gameArea) {
      throw new Error("You forgot to add to your <body> this div: <div id='gameArea'>...</div>");
    }
    oldSizes = null;
    rescale();
  }

  function round2(num: number): number {
    return Math.round(num * 100) / 100;
  }

  function rescale(): void {
    if (widthToHeight === null) {
      return;
    }
    let originalWindowWidth = window.innerWidth; // doc.body.clientWidth
    let originalWindowHeight = window.innerHeight; // I saw cases where doc.body.clientHeight was 0.
    let windowWidth = originalWindowWidth;
    let windowHeight = originalWindowHeight;
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

    if (windowWidth === 0 || windowHeight === 0) {
      log.info("Window width/height is 0 so hiding gameArea div.");
      gameArea.style.display = "none";
      return;
    }
    gameArea.style.display = "block";

    let newWidthToHeight = windowWidth / windowHeight;

    if (newWidthToHeight > widthToHeight) {
      windowWidth = round2(windowHeight * widthToHeight);
    } else {
      windowHeight = round2(windowWidth / widthToHeight);
    }
    log.info("Window size is " + oldSizes.windowWidth + "x" + oldSizes.windowHeight +
        " so setting gameArea size to " + windowWidth + "x" + windowHeight +
        " because widthToHeight=" + widthToHeight);

    // Take 5% margin (so the game won't touch the end of the screen)
    let keepMargin = 0.95;
    windowWidth *= keepMargin;
    windowHeight *= keepMargin;
    gameArea.style.width = windowWidth + 'px';
    gameArea.style.height = windowHeight + 'px';
    gameArea.style.position = "absolute";
    gameArea.style.left = ((originalWindowWidth - windowWidth)/2) + 'px';
    gameArea.style.top = ((originalWindowHeight - windowHeight)/2) + 'px';
  }

  doc.addEventListener("onresize", rescale);
  doc.addEventListener("orientationchange", rescale);
  setInterval(rescale, 1000);
}