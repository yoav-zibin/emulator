(function () {
  'use strict';
  /*global angular */

  // Copied from:
  // http://coderdiaries.com/2014/03/09/drag-and-drop-with-angularjs/
  angular.module('myApp').directive('ddDraggable', [function () {
    return {
      restrict: "AC",
      link: function (scope, element, attrs) {
        var draggingLines = document.getElementById("draggingLines");
        var horizontalDraggingLine = document.getElementById("horizontalDraggingLine");
        var verticalDraggingLine = document.getElementById("verticalDraggingLine");
        var deltaLeft, deltaTop;
        if (attrs['ddDraggable'] === 'true') {
          console.log("Setting draggable");
          element.draggable({
            snap: ".snapTarget",
            snapTolerance: element.width() / 2,
            snapMode: "inner",
            revert: "invalid",
            start: function () {
              draggingLines.style.display = "block";
              var id = element[0].id;
              console.log("start draggable of id=" + id);
              // Setting snapTolerance again because the width might change due to orientation change.
              element.draggable( "option", "snapTolerance", element.width() / 2);
              scope.handleDragStart(id);

              var w = element.width() / 2;
              var gameAreaOffset = $("#gameArea").offset();
              var offset = element.offset();
              deltaLeft = (offset.left - gameAreaOffset.left) + w;
              deltaTop = (offset.top - gameAreaOffset.top) + w;
            },
            stop: function () {
              draggingLines.style.display = "none";
              console.log("stop draggable of id=" + element[0].id);
            },
            drag: function( event, ui ) {
              verticalDraggingLine.setAttribute("x1", ui.position.left + deltaLeft);
              verticalDraggingLine.setAttribute("x2", ui.position.left + deltaLeft);
              horizontalDraggingLine.setAttribute("y1", ui.position.top + deltaTop);
              horizontalDraggingLine.setAttribute("y2", ui.position.top + deltaTop);
              //console.log(ui.position.left + "x" + ui.position.top + " offset: " + ui.offset.left + "x" + ui.offset.top);
              //ui.position.left = Math.min( 100, ui.position.left );
            }
          });
        }
      }
    };
  }]);
}());
