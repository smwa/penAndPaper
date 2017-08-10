app.controller('FreeformsController', ['$scope', 'datatransfer', '$sce', '$http', '$interval', function($scope, datatransfer, $sce, $http, $interval) {

    var ACTIONURL = 'api/statuses?gameid=' + datatransfer.gameid + "&laststatusescount=";
    var REFRESHRATE = 1000;

    //EXTERNAL DEPENDENCY
    var showdownconverter = new showdown.Converter();
  
  
    var laststatusescount = 0;

    $scope.freeforms = [];
  
    $scope.opened = 0;
  
    $scope.setOpened = function(index) {
      if ($scope.opened == index) $scope.opened = -1;
      else $scope.opened = index;
    };
  
    getFreeforms();

    function getFreeforms() {
      $http({method: 'GET', 'url': ACTIONURL + laststatusescount})
        .then(function successCallback(response) {
          response.data.statuses.forEach(function (item) {
            item.text = $sce.trustAsHtml(showdownconverter.makeHtml(item.text));
          });
          laststatusescount = response.data.laststatusescount;
          $scope.freeforms = response.data.statuses;
        
          setTimeout(getFreeforms, REFRESHRATE);
        }, function errorCallback(response) {
          console.log('failed to get freeforms');
          setTimeout(getFreeforms, REFRESHRATE);
        });
    }

  }]);
