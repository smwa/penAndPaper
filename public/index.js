var app = angular.module('pnp', []);
app.factory('datatransfer', ['$location', function ($location) {
  return {
    'name' : null,
    'gameid': $location.hash()
  };
}]);
