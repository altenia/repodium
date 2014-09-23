'use strict';

/**
 * PENDING (still using from the index.html)
 * @ngdoc function
 * @name GitriumWebApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the GitriumWebApp
 */
//var gitriumApp = angular.module('GitriumWebApp');

gitriumApp.controller('MainCtrl', function ($scope, $http, GitriumService) {
  $scope.repos = {};
  $scope.branches = {};
  $scope.serverInfo = "Gitrium";

  // Retrieve server info
  GitriumService.getServerInfo()
    .success(function(data, status, headers, config) {
      $scope.serverInfo = data;
    })
    .error(function(data, status, headers, config) {
      console.log(data);
    });

  // Retrieve server repo info
  GitriumService.getRepos($scope.repos)
    .success(function(data, status, headers, config) {
      $scope.repos = data.repositories;
    })
    .error(function(data, status, headers, config) {
      console.log(data);
    });

  /**
   * Load Branches. Called by the x-editor
   * @param  {string} repoName The repository
   */
  $scope.loadBranches = function(repoName) {
    //$scope.branches[repoName] = ['a', 'b'];
    GitriumService.getBranches(repoName)
      .success(function(data, status, headers, config) {
        $scope.branches[repoName] = data.result.branches;
      })
      .error(function(data, status, headers, config) {
        console.log(data);
      });
  };

  /**
   * Checkout a branch. Called by the x-editor, when branch is changed
   * @param  {string} repoName The repository
   * @param  {string} branch   The branch
   */
  $scope.repoCheckout = function(repoName, branch) {
    GitriumService.checkout(repoName, branch)
      .success(function(data, status, headers, config) {
        // SUccess
      })
      .error(function(data, status, headers, config) {
        alert('Error checkout ' + branch + '\n' + JSON.stringify(data));
        console.log(data);
      });
  };

  /**
   * Clone a remote repo. Called by the x-editor
   * @param  {string} url      The url or the remote repo
   * @param  {string} repoName The repository
   */
  $scope.repoClone = function(url, repoName) {
    var url = url || $('#cloneRemoteUrl').val();
    var repoName = repoName || $('#cloneRepoName').val();

    var origCursor = setCursor('wait');

    GitriumService.clone(url, repoName)
      .success(function(data, status, headers, config) {
        $scope.repos[repoName] = data.repository;
        //alert('Cloned:' + repoName + '\n' + JSON.stringify(data));
      })
      .error(function(data, status, headers, config) {
        console.log(data);
      })
      .finally(function(){
        document.body.style.cursor = origCursor;
      });
  };
  
  /**
   * Checkout a branch. Called by the x-editor, when branch is changed
   * @param  {string} repoName The repository
   * @param  {string} branch   The branch
   */
  $scope.repoLog = function(repoName) {
    GitriumService.getLogs(repoName)
      .success(function(data, status, headers, config) {
        //alert('Logs ' + JSON.stringify(data.result));
        openResultModal("Log of " + repoName, JSON.stringify(data.result));
      })
      .error(function(data, status, headers, config) {
        console.log(data);
      });
  };

  /**
   * Pull Repo. Called by the x-editor
   * @param  {string} repoName The repository
   */
  $scope.repoRemove = function(repoName) {
    
    var origCursor = setCursor('wait');

    if (confirm('Are you sure you want delete ' + repoName + ' repo?'))
    {      
      GitriumService.remove(repoName)
        .success(function(data, status, headers, config) {
          delete $scope.repos[repoName];
          delete $scope.branches[repoName];
          document.body.style.cursor = origCursor;
        })
        .error(function(data, status, headers, config) {
          console.log(data);
        })
        .finally(function(){
          document.body.style.cursor = origCursor;
        });
    } 
    
  };
  
  /**
   * Pull Repo. Called by the x-editor
   * @param  {string} repoName The repository
   */
  $scope.repoPull = function(repoName) {

    var origCursor = setCursor('wait');

    GitriumService.pull(repoName)
      .success(function(data, status, headers, config) {
        GitriumService.getRepoInfo(repoName)
        .success(function(getInfoData, status, headers, config) {
          $scope.repos[repoName] = getInfoData.repository;
        });
      })
      .error(function(data, status, headers, config) {
        alert('pulled:' + repoName + '\n' + JSON.stringify(data));
        console.log(data);
      })
      .finally(function(){
        document.body.style.cursor = origCursor;
      });
  };

  /**
   * Pull Repo. Called by the x-editor
   * @param  {string} repoName The repository
   */
  $scope.repoPush = function(repoName) {
    alert("NOT IMPLEMENTED");
  }

  $scope.projectBuild = function(repoName, target) {
    var tool = $scope.repos[repoName].build[0];
    var target = target || $('#buildTarget').val();
    var origCursor = setCursor('wait');

    GitriumService.buildProject(repoName, tool, target)
      .success(function(data, status, headers, config) {
        var result = (data.error) ? 'Error: ' + data.result.stderr 
          : data.result.stdout;
        alert('Build of ' + repoName + ' completed.\n' + result);
      })
      .error(function(data, status, headers, config) {
        alert('Build failed:' + repoName + '\n' + JSON.stringify(data));
        console.log(data);
      })
      .finally(function(){
        document.body.style.cursor = origCursor;
      });
  };
  

  $scope.getInitials = function(text) {
    var arr = text.split( ' ' );

    var result = '';
    for(var x = 0; x < arr.length; x++) 
        result += arr[x].charAt(0);
    return result;
  }

  function openResultModal(title, body)
  {
    $('#result_title').text(title);
    $('#result_body').text(body);
    $('#result_modal').modal('show');
  }

  function setCursor(newCursor)
  {
    var origCursor = document.body.style.cursor;
    document.body.style.cursor = newCursor;
    return origCursor;
  }

});
