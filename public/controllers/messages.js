app.controller('MessagesController', ['$scope', '$sce', '$http', 'datatransfer', function($scope, $sce, $http, datatransfer) {

    //EXTERNAL DEPENDENCY
    var showdownconverter = new showdown.Converter();

    var POSTURL = 'api/messages?gameid=' + datatransfer.gameid;
    var GETURL = 'api/messages?gameid='+datatransfer.gameid+'&lastmessage=';

    var REFRESHRATE = 1000;

    $scope.messages = [];

    $scope.model = {
      'message': ''
    };

    function getMessages() {
      $http.get(GETURL + $scope.messages.length).then(function (response) {
        response.data.forEach(function (item) {
          $scope.messages.push($sce.trustAsHtml(showdownconverter.makeHtml(item)));
          setTimeout(function() {
            var elem = document.getElementById('messages');
            elem.scrollTop = elem.scrollHeight;
          }, 10);
        });
        setTimeout(getMessages, REFRESHRATE);
      }, function (response) {
        setTimeout(getMessages, REFRESHRATE);
      });
    }

    $scope.sendMessage = function sendMessage() {
      $http({method: 'POST', 'url': POSTURL, 'data': {'message': $scope.model.message}})
      $scope.model.message = "";
    }

    getMessages();

  }]);
