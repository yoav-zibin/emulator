'use strict';

angular.module('myApp')
  .service('serverApiService', function($window, $log, $rootScope) {

    var secretCode = null;
    var waitingForReply = [];
    var serverApiIframe = null;

    function sendMessageInPosition(position) {
      serverApiIframe.contentWindow.postMessage(
        {id: position, secretCode: secretCode, msg: waitingForReply[position].msg}, "*");

    }
    function sendMessage(msg, callback) {
      $log.info("serverApiService sends: ", msg);
      waitingForReply.push({msg: msg, callback: callback});
      if (secretCode !== null) {
        sendMessageInPosition(waitingForReply.length - 1);
      }
    }

    function listenMessage(event) {
      $rootScope.$apply(function () {
        var msg = event.data;
        if (secretCode === null) {
          secretCode = eval(msg);
          for (var i = 0; i < waitingForReply.length; i++) {
            sendMessageInPosition(i);
          }
        } else {
          $log.info("serverApiService got: ", msg);
          var position = msg.id;
          var reply = msg.reply;
          var callback = waitingForReply[position].callback;
          delete waitingForReply[position];
          callback(reply);
        }
      });
    }

    // Loads server_api.html in an iframe
    function loadServerApi() {
      var iframeSrc = "https://multiplayer-gaming.appspot.com/server_api.html";
      $log.info("Loading ", iframeSrc);
      if ($window.addEventListener) {
        $window.addEventListener("message", listenMessage, false);
      } else {
        $window.attachEvent("onmessage", listenMessage);
      }
      serverApiIframe = $window.document.createElement("IFRAME");
      serverApiIframe.setAttribute("src", iframeSrc);
      serverApiIframe.style.width = "0px";
      serverApiIframe.style.height = "0px";
      serverApiIframe.style.visibility = "hidden";
      serverApiIframe.style.display = "none";
      $window.document.body.appendChild(serverApiIframe);
    }

    loadServerApi();

    this.sendMessage = sendMessage;
  });
