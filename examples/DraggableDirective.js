(function () {
  'use strict';
  /*global angular */

  // Copied from:
  // http://coderdiaries.com/2014/03/09/drag-and-drop-with-angularjs/
  angular.module('myApp').directive('ddDraggable', [function () {
    return {
      restrict: "AC",
      link: function (scope, element, attrs) {
        if (attrs['ddDraggable'] === 'true') {
          element.draggable({
            snap: ".snapTarget",
            snapTolerance: element.width() / 2,
            snapMode: "inner",
            revert: "invalid",
            start: function () {
              // Setting snapTolerance again because the width might change due to orientation change.
              element.draggable( "option", "snapTolerance", element.width() / 2);
              var id = element[0].id;
              scope.handleDragStart(id);
            }/*,
            drag: function( event, ui ) {
              //console.log(ui.position.left + "x" + ui.position.top + " offset: " + ui.offset.left + "x" + ui.offset.top);
              //ui.position.left = Math.min( 100, ui.position.left );
            }*/
          });
        }
      }
    };
  }]);
}());
