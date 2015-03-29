angular.module('myApp', [])
.run(function ($log, realTimeService) {
  'use strict';

  var canvasWidth = 300;
  var canvasHeight = 300;

  function createCanvasController(canvas) {
    var lines = [];
    var ctx = canvas.getContext("2d");

    function redrawCanvas() {
      $log.info("redrawCanvas:", lines);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.strokeStyle = "black";
      ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = 'black';
      ctx.font = '18px sans-serif';
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 10, (i + 1) * 20);
      }
    }

    function gotStartMatch(params) {
      $log.info("gotStartMatch:", params);
      var yourPlayerIndex = params.yourPlayerIndex;
      var playersInfo = params.playersInfo;
      var matchController = params.matchController;
      lines = [
        "yourPlayerIndex=" + yourPlayerIndex,
        "playersInfo:",
        angular.toJson(playersInfo)
      ];
      redrawCanvas();

      setTimeout(function () {
        matchController.sendReliableMessage('Reliable');
        setTimeout(function () {
          matchController.sendUnreliableMessage('Unreliable');
          setTimeout(function () {
            var endMatchScores = [];
            for (var i = 0; i < playersInfo.length; i++) {
              endMatchScores.push(42 + i);
            }
            matchController.endMatch(endMatchScores);
          }, 1000);
        }, 1000);
      }, 1000);
    }

    function gotMessage(params) {
      $log.info("gotMessage:", params);
      var fromPlayerIndex = params.fromPlayerIndex;
      var message = params.message;
      lines.push("msg=" + message + " from " + fromPlayerIndex);
      redrawCanvas();
    }

    function gotEndMatch(endMatchScores) {
      $log.info("gotEndMatch:", endMatchScores);
      lines.push("end match scores=" + endMatchScores);
      redrawCanvas();
    }

    return {
      gotStartMatch: gotStartMatch,
      gotMessage: gotMessage,
      gotEndMatch: gotEndMatch
    };
  }

  realTimeService.init({
    createCanvasController: createCanvasController,
    canvasWidth: canvasWidth,
    canvasHeight: canvasHeight
  });
});
