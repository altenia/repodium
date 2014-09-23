var Hapi = require("hapi");
var nconf = require('nconf');

nconf.argv()
       .env()
       .file({ file: './conf/repodium.conf.json' });

var port = nconf.get('port');
var repoBaseDir = nconf.get('repoBaseDir');
var logConf = nconf.get('log');

var server = new Hapi.Server(port, {
    cors: true
});

server.pack.register([
	    { plugin: require("lout") },
	    { plugin: require("./index"), options: { repoBaseDir: repoBaseDir, log: logConf}
    }
], function(err) {
    if (err) throw err;
    server.start(function() {
        console.log("Gitrium server started @ " + server.info.uri);
    });
});