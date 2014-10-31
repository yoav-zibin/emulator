'use strict';

angular.module('myApp', [])
  .controller('Ctrl', function ($scope, serverApiService) {
    serverApiService.sendMessage(
        [{getServerApi:{serverApiResult:"TYPE_DESCRIPTIONS_RESULT"}}],
        function (response) {
          $scope.closureTypes = angular.toJson(response[0].serverApiTypeDescriptions, true);
        });
    $scope.sendMessage = function () {
      var messageObj = eval($scope.json);
      serverApiService.sendMessage(messageObj, function (response) {
        $scope.response = angular.toJson(response, true);
      });
    };
  })
  .factory('$exceptionHandler', function ($window, serverApiServiceWithoutRootScope) {
    return function (exception, cause) {
      exception.message += ' (caused by "' + cause + '")';
      serverApiServiceWithoutRootScope.sendMessage([{emailJavaScriptError: {gameDeveloperEmail: "yoav.zibin@gmail.com", emailSubject: "Error in serverApiTest", emailBody: angular.toJson(exception, true)}}]);
      $window.alert(exception.message);
      throw exception;
    };
  });
