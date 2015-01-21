(function () {
  'use strict';
  /*global angular */

  // Copied from:
  // http://coderdiaries.com/2014/03/09/drag-and-drop-with-angularjs/
  angular.module('myApp').directive('ddDropTarget', [function () {
    return {
      restrict: "AC",
      link: function (scope, element, attrs) {
        if (attrs['ddDropTarget'] === 'true') {
          element.droppable({
            drop: function () {
              var id = element[0].id;
              scope.handleDrop(id);
            }
          });
        }
      }
    };
  }]);
}());
