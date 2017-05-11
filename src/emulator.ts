namespace gamingPlatform {

export interface SavedState {
  name: string;
  history: IMove[];
  playerIdToProposal: IProposals;
}
export interface Language {
  name: string;
  code: string;
}
export interface StringIndexer {
   [name: string]: string;
}

export interface MessageToTopIframe {
  gameIframeId: number;
  fromGameMessage: IMessageToPlatform;
}
export interface MessageFromTopIframe {
  rows: number;
  cols: number;
  toGameIframeId: number;
  toGameMessage: IMessageToGame;
}

export module emulator {
  export let iframeRows = 0;
  export let iframeCols = 0;
  export let locationTrustedStr: any = null;
  
  // TODO:
  // * test getLogs.
  let testingHtml = `
    <div style="position:absolute; width:100%; height:10%; overflow: scroll;">
      <iframe id="emulator_top_iframe"
        src="https://yoav-zibin.github.io/emulator/emulatorTopIframe.html"
        seamless="seamless" style="position:absolute; width:100%; height:100%; left:0; top:0;">
      </iframe>
    </div>
    <div style="position:absolute; width:100%; height:90%; top: 10%;">
      <div ng-repeat="row in emulator.getIntegersTill(emulator.iframeRows)"
          style="position:absolute; top:{{row * 100 / emulator.iframeRows}}%; left:0; width:100%; height:{{100 / emulator.iframeRows}}%;">
        <div ng-repeat="col in emulator.getIntegersTill(emulator.iframeCols)"
            style="position:absolute; top:0; left:{{col * 100 / emulator.iframeCols}}%; width:{{100 / emulator.iframeCols}}%; height:100%;">
          <iframe id="game_iframe_{{col + row*emulator.iframeCols}}"
            ng-src="{{emulator.locationTrustedStr}}"
            seamless="seamless" style="position:absolute; width:100%; height:100%; left:0; top:0;">
          </iframe>
        </div>
      </div>
    </div>
  `;

  let cacheIntegersTill: number[][] = [];
  export function getIntegersTill(number: any): number[] {
    if (cacheIntegersTill[number]) return cacheIntegersTill[number]; 
    let res: number[] = [];
    for (let i = 0; i < number; i++) {
      res.push(i);
    }
    cacheIntegersTill[number] = res;
    return res;
  }


  export function reloadIframes(newRows: number, newCols: number) {
    log.log("reloadIframes");
    // Setting to 0 to force the game to send gameReady and then it will get the correct changeUI.
    iframeRows = 0;
    iframeCols = 0;
    $timeout(()=>{
      iframeRows = newRows;
      iframeCols = newCols;
    });
  }

  function getIframe(id: string) {
    let iframe = <HTMLIFrameElement> window.document.getElementById(id);
    if (!iframe) {
      console.error("Can't find src=", id);
      return null;
    }
    return iframe.contentWindow;
  }
  function getTopIframe() {
    return getIframe("emulator_top_iframe");
  }
  function getGameIframe(id: number) {
    return getIframe("game_iframe_" + id);
  }

  function passMessage(msg: IMessageToGame, toIndex: number): void {
    getGameIframe(toIndex).postMessage(msg, "*");
  }
  function getIndexOfSource(src: Window) {
    let i = 0;
    while (true) {
      if (getGameIframe(i) === src) return i;
      i++;
    }
  }

  export function overrideInnerHtml() {
    log.info("Overriding body's html");
    $rootScope['emulator'] = emulator;
    locationTrustedStr = $sce.trustAsResourceUrl(location.toString());
    let el = angular.element(testingHtml);
    
    // Hide all elements in body.
    for(let child: any = window.document.body.firstChild; child; child=child.nextSibling) {
      if (child.style) child.style.display = "none";
    }

    angular.element(window.document.body).append($compile(el)($rootScope));
    window.addEventListener("message", (event)=>{
      $rootScope.$apply(()=>gotMessageFromGame(event));
    });
  }
  
  function gotMessageFromTopIframe(data: MessageFromTopIframe) {
    if (data.toGameMessage) {
      passMessage(data.toGameMessage, data.toGameIframeId);
    } else {
      reloadIframes(data.rows, data.cols);
    }
  }

  function gotMessageFromGame(event: MessageEvent) {
    let source = event.source;

    if (getTopIframe() === source) {
      gotMessageFromTopIframe(event.data);
      return;
    }

    let id = getIndexOfSource(source);
    if (id == -1) return;
    let message: IMessageToPlatform = event.data;
    let toTopIframe: MessageToTopIframe = {fromGameMessage: message, gameIframeId: id};
    getTopIframe().postMessage(toTopIframe, "*");
  }
}

}