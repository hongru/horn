#! /usr/bin/env node

var program = require('commander');
var colors = require('colors');
var cwd = process.cwd();

var Horn = require('../lib/horn');
var pkg = require('../package.json');

program
  .version(pkg.version)
  .usage('[options]')
  .option('-r, --root <dir>', 'root of horn static server, default `./`')
  .option('-c, --cache <sec>', 'cache time(seconds) of static file, default `3600`')
  .option('-D, --dontShowDir', 'do not show dir when server running')
  .option('-A, --dontAutoIndex', 'do not serve file with name `index` such as `index.html` automatic')
  .option('-t, --contentType <type>', 'default contentType of file')
  .option('-e, --ext <ext>', 'default ext of file `html`')
  .option('-C, --cors', 'enable HTTP access control(CORS)')
  .option('-p, --proxy <ip>', 'set http-proxy with specific ip')
  .option('-s, --https', 'enable https server')
  .option('-H, --host <host>', 'server host by horn, default (127.0.0.1)')
  .option('-P, --port <port>', 'server port by horn, default (9999)')
  .option('-f, --hornfile <path>', '`hornfile` path to set more configuration')
  .parse(process.argv);

var param = {
  root: program.root || './',
  cache: program.cache || 3600,
  showDir: !program.dontShowDir,
  autoIndex: !program.dontAutoIndex,
  contentType: program.contentType || 'application/octet-stream',
  ext: program.ext || 'html',
  cors: program.cors,
  proxy: program.proxy || null,
  https: program.https,
  host: program.host || '127.0.0.1',
  port: program.port || 9999,
  hornfile: program.hornfile || null,
  log: function(req, res, error) {
    var log = console.log;
    var date = (new Date).toUTCString();
    if (error) {
      log('[%s] "%s %s" Error (%s): "%s"', date.yellow, req.method.red, req.url.red, error.status.toString().red, error.message.red);
    } else {
      log('[%s] "%s %s" "%s"', date.yellow, req.method.cyan, req.url.cyan, req.headers['user-agent']);
    }
  }
}


// start
var horn = new Horn(param);
horn.createServer();

if (param.port == 80) {
  console.log(' Warn '.bgYellow.bold + ' You used port 80 as Hron static server. Flex-Combo HTTP Server(need port 80) has been hung up!'.bgWhite.black)
} else if (param.port == 443) {
  console.log(' Warn '.bgYellow.bold + ' You used port 443 as Hron static server. Flex-Combo HTTPS Server(need port 443) has been hung up!'.bgWhite.black)
} else {
  horn.flexHosts();
  horn.flexCombo();
}

