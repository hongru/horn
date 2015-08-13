#! /usr/bin/env node

var Union = require('./union');
var colors = require('colors');
var flexHosts = require('flex-hosts');
var flexCombo = require('flex-combo');
var http = require('http');
var https = require('https');
var fs = require('fs');
var exec = require('child_process').exec;
var Hornhandler = require('./hornfile');
var cwd = process.cwd();
var path = require('path');

var extend = function (d, s) {
  for (var k in s) {
    d[k] = s[k];
  }
  return d;
}

var Horn = module.exports = function (param) {
  var defaults = {
    root: cwd,
    headers: {},
    cache: 3600, //sec
    showDir: true,
    autoIndex: true,
    contentType: 'application/octet-stream',
    ext: 'html',
    cors: false,
    proxy: null,
    https: false,
    before: [],
    log: function (req, res) {},
    hornfile: null,
    host: '127.0.0.1',
    port: '9999' // 默认80端口和443端口留给flex-combo
  };

  extend(this, extend(defaults, (param || {})));
  // check hornfile
  this._checkHornfile();
};

Horn.prototype = {
  createServer: function () {
    var me = this;
    var server = new Union({
      root: this.root,
      headers: this.headers,
      cache: this.cache,
      showDir: this.showDir,
      autoIndex: this.autoIndex,
      contentType: this.contentType,
      ext: this.ext,
      cors: this.cors,
      proxy: this.proxy,
      https: this.https,
      before: this.before,
      log: this.log
    });

    server.listen(this.port, this.host, function () {
      console.log('Starting up '+'Horn'.red.bold.underline+' server '. yellow
        + server.opt.root.cyan
        + ' on '.yellow
        + ('http://' + me.host + ':' + me.port).cyan);
    });

    this.server = server;
    return this;
  },
  _checkHornfile: function () {
    var hornfileDir = typeof this.hornfile === 'string' ? path.dirname(this.hornfile) : this.root;
    this.hornfileHandler = new Hornhandler(hornfileDir);
    this.hornfile = this.hornfileHandler.hornfile;

    if (this.hornfile) {
      extend(this, (this.hornfileHandler.content || {}));
    }
  },
  flexHosts: function () {
    //console.log(this.localMap);
    if (this.hornfile && this.localMap) {
      var hosts = Object.keys(this.localMap);
      if (hosts.length) {
        var p = {};
        p[this.host] = hosts;
        flexHosts(p, function (err, hosts) {
          // success flex hosts
        });
      }
    }

    return this;
  },
  flexCombo: function () {
    var me = this;
    if (this.hornfile && this.localMap) {
      var urls = {};
      for (var k in this.localMap) {
        for (var rule in this.localMap[k]) {
          urls[rule] = this.localMap[k][rule];
        }
      }
      //console.log(urls);
      var flexComboParam = {
        rootdir: this.root,
        urls: urls
      };

      var platform = require("os").platform();
      var rootCA = path.join(__dirname, "rootCA.crt");
      var genCert = __dirname + "/gen-cer.sh";

      var InstallRootCA;
      if (platform.match(/^win/i)) {
        InstallRootCA = "certutil -addstore -f \"ROOT\" new-root-certificate.crt";
        genCert = __dirname + "/gen-cer.bat";
      }
      else if (platform.match(/darwin/i)) {
        InstallRootCA = "sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain " + rootCA;
      }
      else {
        // TODO: Linux
      }
      InstallRootCA && exec(InstallRootCA, function () {
        console.log("The rootCA is installed!");
      });

      var userHome = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH; // 兼容windows
      var dir = path.join(userHome, ".flex-combo");
      var comboInst = flexCombo(flexComboParam, path.join(dir, "config.json"));
      var defaultHost = "127.0.0.1";
      var http_port = 80;
      var https_port = 443;
      
      // http flex server
      http.createServer(function (req, res) {
        function next() {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Flex-Combo `HTTP` Server is running at ' + me.host + ':80');
          }

          try {
            req.protocol = "http";
            comboInst(req, res, next);
          }
          catch (e) {
            next();
          }
      }).listen(http_port, function () {
        console.log('Flex Combo HTTP Server running at http://' + defaultHost + ':' + http_port);
      });

      // https flex server
      https.createServer({
        SNICallback: function (domain, SNICallback) {
          var createSecureContext = require("tls").createSecureContext;

          if (!(typeof SNICallback == "function" && createSecureContext)) {
            console.log("Your Node.js IS NOT support Async SNI, please UPDATE your Node.js >= 0.12");
            return;
          }

          var serverPath = path.join(dir, ".server");
          if (!fs.existsSync(serverPath)) {
            fs.mkdirSync(serverPath);
            fs.chmod(serverPath, 0777);
          }

          var certPath = path.join(serverPath, domain);
          var key = certPath + ".key";
          var crt = certPath + ".crt";
          exec([genCert, domain, serverPath, path.dirname(rootCA)].join(' '), function (err) {
            if (!err) {
              SNICallback(null, createSecureContext({
                key: fs.readFileSync(key, "utf-8"),
                cert: fs.readFileSync(crt, "utf-8")
              }));
              fs.chmod(key, 0777);
              fs.chmod(crt, 0777);
            }
            else {
              SNICallback(err);
            }
          });
        },
        key: fs.readFileSync(path.join(__dirname, defaultHost) + ".key", "utf-8"),
        cert: fs.readFileSync(path.join(__dirname, defaultHost) + ".crt", "utf-8"),
        ca: fs.readFileSync(rootCA, "utf-8")
      },
      function (req, res) {
        function next() {
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end('Flex-Combo `HTTPS` Server is running at ' + defaultHost + ':' + https_port);
        }

        try {
          req.protocol = "https";
          comboInst(req, res, next);
        }
        catch (e) {
          next();
        }
      })
      .listen(https_port, function () {
        console.log('Flex Combo HTTPS Server running at https://' + defaultHost + ':' + https_port);
      });
    }

    return this;
  }
}




