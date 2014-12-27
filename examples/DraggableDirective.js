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
            revert: "invalid",
            start: function () {
              var id = element[0].id;
              scope.handleDragStart(id);
            }
          });
        }
        // It seems the jQuery UI changed the css property of the element
        // and will cause the problem for animation, so here change it back.
        //element[0].style.position = 'absolute';
        //element[0].style['z-index'] = '40';
      }
    };
  }]);
}());
