app.controller('FreeformController', ['$scope', 'datatransfer', '$http', function($scope, datatransfer, $http) {

    var POSTSTATUSURL = 'api/statuses?gameid=' + datatransfer.gameid;
    var GETURL = 'api/statuses?gameid=' + datatransfer.gameid;
    var POSTURL = 'api/name?gameid=' + datatransfer.gameid;
    var GETNAMEURL = 'api/name?gameid=' + datatransfer.gameid;

    $scope.model = {
      playername: '',
      text: ''
    };


    $scope.setfreeform = function () {
      $http({method: 'POST', 'url': POSTSTATUSURL, 'data': {'text': $scope.model.text}});
    }


  $http({method: 'GET', 'url': GETNAMEURL})
    .then(function successCallback(response) {
      $scope.model.playername = response.data.name;
      datatransfer.name = response.data.name;

      $http({method: 'GET', 'url': GETURL})
        .then(function successCallback(response) {
          response.data.forEach(function (item) {
            if (item.name == datatransfer.name) {
              $scope.model.text = item.text;
            }
          });
        }, function errorCallback(response) {
          console.log('failed to get freeforms');
        });

    }, function errorCallback(response) {
      console.log('failed to get name');
    });

  $scope.setname = function () {
    $http({method: 'POST', 'url': POSTURL, 'data': {'name': $scope.model.playername}})
      .then(function success(response) {
        if (response.data.errors && response.data.errors.length) {
          $scope.model.playername = datatransfer.name;
          alert(response.data.errors[0]);
        }
        else {
          datatransfer.name = $scope.model.playername;
        }
      }, function failure(response) {
        console.log('failed to set name');
      });
  };

  }]);
