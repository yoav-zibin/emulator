// You use dragAndDropService like this:
// dragAndDropService.addDragListener(touchElementId, function handleDragEvent(type, clientX, clientY, event) {...});
// touchElementId can be "gameArea" (or any other element id).
// type is either: "touchstart", "touchmove", "touchend", "touchcancel", "touchleave"
angular.module('myApp')
.factory('dragAndDropService', ['$log', function ($log) {
  'use strict';

  function addDragListener(touchElementId, handleDragEvent) {
    if (!touchElementId || !handleDragEvent) {
      throw new Error("When calling addDragListener(touchElementId, handleDragEvent), you must pass two parameters");
    }

    var isMouseDown = false;

    function touchHandler(event) {
      var touch = event.changedTouches[0];
      handleEvent(event, event.type, touch.clientX, touch.clientY);
    }

    function mouseDownHandler(event) {
      isMouseDown = true;
      handleEvent(event, "touchstart", event.clientX, event.clientY);
    }

    function mouseMoveHandler(event) {
      if (isMouseDown) {
        handleEvent(event, "touchmove", event.clientX, event.clientY);
      }
    }

    function mouseUpHandler(event) {
      isMouseDown = false;
      handleEvent(event, "touchend", event.clientX, event.clientY);
    }

    function handleEvent(event, type, clientX, clientY) {
      // http://stackoverflow.com/questions/3413683/disabling-the-context-menu-on-long-taps-on-android
      // I also have:  touch-callout:none and user-select:none in main.css
      if (event.preventDefault) {
        event.preventDefault(); // Also prevents generating mouse events for touch.
      }
      if (event.stopPropagation) {
        event.stopPropagation();
      }
      event.cancelBubble = true;
      event.returnValue = false;
      $log.debug("handleDragEvent:", type, clientX, clientY);
      handleDragEvent(type, clientX, clientY, event);
    }

    var gameArea = document.getElementById(touchElementId);
    if (!gameArea) {
      throw new Error("You must have <div id='" + touchElementId + "'>...</div>");
    }
    gameArea.addEventListener("touchstart", touchHandler, true);
    gameArea.addEventListener("touchmove", touchHandler, true);
    gameArea.addEventListener("touchend", touchHandler, true);
    gameArea.addEventListener("touchcancel", touchHandler, true);
    gameArea.addEventListener("touchleave", touchHandler, true);
    gameArea.addEventListener("mousedown", mouseDownHandler, true);
    gameArea.addEventListener("mousemove", mouseMoveHandler, true);
    gameArea.addEventListener("mouseup", mouseUpHandler, true);
  }

  return {addDragListener: addDragListener};
}]);
