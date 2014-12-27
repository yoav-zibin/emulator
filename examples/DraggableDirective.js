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
      }
    };
  }]);
}());
