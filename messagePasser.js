'use strict';

(function () {
  function sendMessageToGame(message) {
    console.log("messagePasser sendMessageToGame:", message);
    window.document.getElementById("game_iframe").contentWindow.postMessage(
      message, "*");
  }
  function sendMessageToPlatform(message) {
    console.log("messagePasser sendMessageToPlatform:", message);
    window.parent.postMessage(message, "*");
  }
  window.addEventListener("message", function (event) {
    var message = event.data;
    console.log("messagePasser got message:", message);
    var source = event.source;
    if (source === window.parent) {
      sendMessageToGame(message);
    } else if (source === window.document.getElementById("game_iframe").contentWindow) {
      sendMessageToPlatform(message);
    } else {
      window.alert("Impossible!");
    }
  }, false);
})();
