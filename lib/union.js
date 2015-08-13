#! /usr/bin/env node

var fs = require('fs');
var union = require('union');
var ss = require('./ss/ss');
var httpProxy = require('http-proxy');
var corser = require('corser');

var extend = function (d, s) {
  for (var k in s) {
    d[k] = s[k];
  }
  return d;
}

var Union = function (opt) {
  var me = this;

  var defaults = {
    root: './',
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
    log: function (req, res) {}
  };

  this.opt = extend(defaults, (opt || {}));

  // create server
  this.server = union.createServer({
    before: this._before(),
    headers: this.opt.headers,
    onError: function (err, req, res) {
      me.opt.log(req, res, err);
      res.end();
    }
  })

};

Union.prototype = {
  _before: function () {
    var me = this;
    var before = this.opt.before || [];
    //log
    before.push(function (req, res) {
      me.opt.log(req, res);
      res.emit('next');
    });

    //cors
    if (me.opt.cors) {
      this.headers['Access-Control-Allow-Origin'] = '*';
      this.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
      before.push(corser.create());
    }

    //static server
    before.push(ss({
      root: this.opt.root,
      cache: this.opt.cache,
      showDir: this.opt.showDir,
      autoIndex: this.opt.autoIndex,
      defaultExt: this.opt.ext,
      contentType: this.opt.contentType,
      handleError: (typeof this.opt.proxy !== 'string')
    }));

    //proxy
    if (typeof this.opt.proxy === 'string') {
      var proxy = httpProxy.createProxyServer({});
      before.push(function (req, res) {
        proxy.web(req, res, {
          target: me.opt.proxy,
          changeOrigin: true
        });
      });
    }
    
    return before;
  },
  listen: function () {
    return this.server.listen.apply(this.server, arguments);
  },
  close: function () {
    return this.server.close();
  }
};


module.exports = Union;
