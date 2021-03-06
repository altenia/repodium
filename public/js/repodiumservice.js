'use strict';

/**
 * @ngdoc service
 * @name webappApp.Journalservice
 * @description
 * # Journalservice
 * Service in the webappApp.
 */
angular.module('RepodiumWebApp')
    // User $resource instead
  .service('RepodiumService', ['$http', function RepodiumService($http) {

    this.serviceBaseUrl = '/repodium';

    this.getServerInfo = function() {
        return $http.get(this.serviceBaseUrl);
    };

    this.getRepos = function() {
      return $http.get(this.serviceBaseUrl + '/repos');
    };

    this.getRepoInfo = function(repoName) {
      return $http.get(this.serviceBaseUrl + '/repos/' + repoName);
    };
    
    this.getBranches = function(repoName) {
      var payload = {
        command: "branch",
        params: {
          args: "-a"
        }
      };
      return $http.post(this.serviceBaseUrl + '/repos/' + repoName + '/command', payload);
    };

    this.getLogs = function(repoName, count) {
      var payload = {
        command: "log",
        params: {
          count: count
        }
      };
      return $http.post(this.serviceBaseUrl + '/repos/' + repoName + '/command', payload);
    };

    this.checkout = function(repoName, branch) {
      var payload = {
        command: "checkout",
        params: {
          branch: branch
        }
      };
      return $http.post(this.serviceBaseUrl + '/repos/' + repoName + '/command', payload);
    };

    this.clone = function(url, repoName) {
      var payload = {
        url: url,
        repoName: repoName
      };
      return $http.post(this.serviceBaseUrl + '/repos', payload );
    };


    this.pull = function(repoName) {
      var payload = {
        command: "pull",
        params: {
          args: "-a"
        }
      };
      return $http.post(this.serviceBaseUrl + '/repos/' + repoName + '/command', payload);
    };

    this.remove = function(repoName) {
      return $http.delete(this.serviceBaseUrl + '/repos/' + repoName );
    };

    this.submoduleUpdate = function(repoName) {
      var payload = {
        command: "submodule",
        params: {
          args: ["update", "--init"]
        }
      };
      return $http.post(this.serviceBaseUrl + '/repos/' + repoName + '/command', payload);
    };

    this.buildProject = function(repoName, tool, target) {
      var payload = {
        command: "build",
        params: {
          tool: tool,
          target: target
        }
      };
      return $http.post(this.serviceBaseUrl + '/repos/' + repoName + '/command', payload);
    };

    function toQueryString(criteria)
    {
      var str = [];
      for(var p in criteria)
      {
        if (criteria.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + '=' + encodeURIComponent(criteria[p]));
        }
      }
      return str.join('&');
    }

  }]);
