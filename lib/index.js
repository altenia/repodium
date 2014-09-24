// Load modules
var os = require('os');
var fs = require('fs');
var path = require('path');
var Hoek = require('hoek');
var Handlebars = require('handlebars');

var utils = require('./utils');
var FileUtil = require('./fileutil').FileUtil;
var git = require('./simplegitcli');

var REPODIUM_VER = "0.0.5+20140923";
var REPO_PATH = '/repos';

var BUILD_TOOLS = {
        'make': { script: 'Makefile'},
        'gradle': {script: 'build.gradle'}, // -q
        'mvn': {script: 'pom.xml'}, // mvn clean
        'ant': {script: 'ant.xml'}
    };

// Declare internals
var internals = {
    defaults: {
        pathPrefix: "/repodium",
        basePath: path.join(__dirname, '..', 'templates'),
        publicPath: path.join(__dirname, '..', 'public'),
        helpersPath: path.join(__dirname, '..', 'templates', 'helpers'),
        partialsPath: path.join(__dirname, '..', 'templates'),
        indexTemplate: 'index',
        routeTemplate: 'route',
    }
};



/**
 * Route endpoints:
 * List of repos: /repodium/repos (GET)
 * New Repo     : /repodium/repos (POST)
 * Repo status  : /repodium/repos/{repo_name}/status (GET)
 * Repo command : /repodium/repos/{repo_name}/command (POST)
 */
exports.register = function(plugin, options, next) {
    
    console.log(JSON.stringify(options));

    var logger_ = utils.getLogger('repodium', options['log']);

	settings = Hoek.applyToDefaults(internals.defaults, options);
    
    // repoBaseDir not provided, go down two level
    var repoBaseDir = settings.repoBaseDir || path.resolve(__dirname) + '/../../repos/';
    repoBaseDir = path.normalize(repoBaseDir);

    repoBaseDir = path.normalize(repoBaseDir);
    if (!utils.endsWith(repoBaseDir, '/')) {
        repoBaseDir += '/';
    }
    if (!fs.existsSync(repoBaseDir)) {
        logger_.error({"baseDir": repoBaseDir}, "Reo base Directory not found.");
    }
    if (!fs.statSync(repoBaseDir).isDirectory()) {
        logger_.error({"baseDir": repoBaseDir}, "repoBaseDir is not a directory.");
    }

    var serverInfo = {
        REPODIUM_VER: REPODIUM_VER,
        hostname: os.hostname(),
        repoBaseDir : repoBaseDir
    };

    logger_.info({"RepoBaseDir": repoBaseDir}, "Registering Gitrium plugin");

    plugin.views({
        engines: settings.engines || {
            html: {
                module: Handlebars
            }
        },
        path: settings.basePath,
        partialsPath: settings.partialsPath,
        helpersPath: settings.helpersPath
        
    });

    /**
     * Index web page
     */
    plugin.route({
        path: settings.pathPrefix + '/index.html',
        method: "GET",
        handler: function(request, reply) {

            
            return reply.view(settings.indexTemplate, serverInfo);
        }
    });

    /**
     * Public web assets
     */
    plugin.route({
        method: 'GET',
        path: settings.pathPrefix + '/public/{path*}',
        config: {
            handler: {
                directory: {
                    path: settings.publicPath,
                    index: false,
                    listing: false
                }
            },
            plugins: {
                lout: false
            }
        }
    });

    /**
     * Browse directory
     */
    plugin.route({
        method: "GET",
        path: settings.pathPrefix + '/browse/{path*}',
        config: {
            handler: {
                directory: {
                    path: repoBaseDir,
                    index: true,
                    listing: true
                }
            },
            plugins: {
                lout: false
            }
        }
    });

    /**
     * API: Server info
     */
    plugin.route({
        path: settings.pathPrefix,
        method: "GET",
        handler: function(request, reply) {

            reply(serverInfo, 200);
        }
    });

    /**
     * API: Repos info
     */
    plugin.route({
        path: settings.pathPrefix + REPO_PATH,
        method: "GET",
        handler: function(request, reply) {
            var repoInfos = {};
            var dirs = getDirectories(repoBaseDir);

            var gitDirs = [];

            for (var i = 0; i < dirs.length; ++i)
            {
                var gitDir = repoBaseDir + dirs[i] + '/.git';
                
                if (fs.existsSync(gitDir)) {
                    gitDirs.push(dirs[i]);
                }
            }

            // To serialize async calls
            function retrieveRepoInfoSer(idx)
            {
                var repoPath = repoBaseDir + gitDirs[idx];
                var repo = new git.Repo(repoPath);

                repo.getInfo(function(err, repoInfo) {
                    repoInfos[gitDirs[idx]] = repoInfo;
                    repoInfos[gitDirs[idx]].build = getBuildTools(repoPath);
                    repoInfos[gitDirs[idx]].hasSubmodules = repo.hasSubmodules();
                    if (idx < gitDirs.length - 1) {
                        retrieveRepoInfoSer(idx + 1);
                    } else {
                        var response = {
                            repositories : repoInfos
                        };
                        reply(response, 200);
                    }
                });
            }
            if (gitDirs.length > 0) {
                retrieveRepoInfoSer(0);
            } else {
                var response = {
                    repositories : []
                };
                reply(response, 200);
            }
        }
    });

    /**
     * API: Single Repo info
     */
    plugin.route({
        path: settings.pathPrefix + REPO_PATH + '/{repoName}',
        method: "GET",
        handler: function(request, reply) {
            var repoName = request.params.repoName;

            var repoPath = repoBaseDir + repoName;
            var repo = new git.Repo(repoPath);
            repo.getInfo(function(err, repoInfo) {
                repoInfo.build = getBuildTools(repoPath);
                repoInfo.hasSubmodules = repo.hasSubmodules();
                if (err) {
                    response = {error: err};
                    reply(response, 500);
                } else {
                    var response = {
                        repository : repoInfo
                    };
                    reply(response, 200);
                }
            });
        }
    });

    /**
     * API: Cloning
     */
    plugin.route({
        path: settings.pathPrefix + REPO_PATH,
        method: "POST",
        handler: function(request, reply) {
            var cloneUrl = request.payload.url;
            var repoName = request.payload.repoName;

            var response = {};
            if (cloneUrl)
            {
                if (!repoName)
                {
                    // Obtaining the repoName from the url
                    repoName = cloneUrl.substring(cloneUrl.lastIndexOf('/') + 1, cloneUrl.lastIndexOf('.'));
                }
                var clonePath = repoBaseDir + repoName;

                git.Repo.clone(cloneUrl, clonePath, null, function(err, data) {
                    if (err) {
                        response = {error: err};
                        reply(response, 500);
                    } else {
                        logger_.info({url: cloneUrl}, "Repo cloned.");
                        // Returning the same info as in the get repos info
                        var repoPath = clonePath;
                        var repo = new git.Repo(repoPath);
                        repo.getInfo(function(err, repoInfo) {
                            repoInfo.build = getBuildTools(repoPath);
                            repoInfo.hasSubmodules = repo.hasSubmodules();
                            var response = {
                                repository : repoInfo
                            };
                            reply(response, 200);
                        });
                    }
                });
            } else {
                response = {error: 'url not provided.'};
                reply(response, 400);
            }
        }
    });

    /**
     * Repo command : /repodium/repos/{repo_name}/command (POST)
     * Payload:
     * {
     *     command: {string} - Command e.g.: checkout
     *     params: {object} - Parameters to be passed to the command
     * }
     */
    plugin.route({
        path: settings.pathPrefix + REPO_PATH + '/{repoName}/command',
        method: "POST",
        handler: function(request, reply) {
            var command = request.payload.command;
            var cmdParams = request.payload.params;
            var repoName = request.params.repoName;

            var response = {};
            if (command && repoName)
            {
                var repoPath = repoBaseDir + repoName;
                var repo = new git.Repo(repoPath);

                var reporCmdFunc = repo[command];

                logger_.info({command: command, repoPath: repoPath}, "Executing command.");

                if (command === 'build') {
                    argList = [cmdParams.target];
                    logger_.debug({path: repoPath, command: cmdParams.tool, argList: argList}, "Executing shell command.");
                    utils.runCommandLine(repoPath, cmdParams.tool, argList, function(err, data){
                        response = {result: data};
                        if (err) {
                            response.error = err; 
                            reply(response, 500);
                        } else {
                            reply(response, 200);
                        }
                    });
                } else {
                    repo[command](cmdParams, function(err, data) {
                        if (err) {
                            response = {error: err};
                            reply(response, 500);
                        } else {
                            // data already is in the correct response format
                            reply(data, 200);
                        }
                    });
                }
            } else {
                response = {error: 'Missing command or repoName'};
                reply(response, 400);
            }
        }
    });

    /**
     * API: Repo Delete
     */
    plugin.route({
        path: settings.pathPrefix + REPO_PATH + '/{repoName}',
        method: "DELETE",
        handler: function(request, reply) {
            var repoName = request.params.repoName;

            var response = {};
            if (repoName)
            {
                var repoPath = repoBaseDir + repoName;
                logger_.info({repoPath: repoPath}, "Removing repo.");

                FileUtil.deleteFolderRecursive(repoPath);
                reply({removed:repoName}, 200);
            } else {
                response = {error: 'Missing repoName'};
                reply(response, 400);
            }
        }
    });

    next();
};
 
exports.register.attributes = {
    pkg: require("../package.json")
};

/**
 * Returns list of folders
 */
function getDirectories(path) {
    return fs.readdirSync(path).filter(function (file) {
        return fs.statSync(path + '/' + file).isDirectory();
    });
}

function getBuildTools(path) {
    var buildTools = [];
    for(var prop in BUILD_TOOLS)
    {
        var buildScriptPath = path + '/' + BUILD_TOOLS[prop].script;
        if (fs.existsSync(buildScriptPath))
        {
            buildTools.push(prop);
        }
    }
    return buildTools;
}
