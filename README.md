# Hron

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][downloads-url]

[npm-image]: https://img.shields.io/npm/v/horn.svg?style=flat-square
[npm-url]: https://npmjs.org/package/horn
[downloads-image]: http://img.shields.io/npm/dm/horn.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/horn


一个基于 NodeJS/Iojs 的极简配置的Http Server。
当然，Horn除了是一个 HTTP Server 之外，还集成了一个针对前端调试很重要的功能 - 线上资源拦截，本地映射。同时可以解开 cdncombo 的资源链接做单独的文件本地映射。
作为前端，在开发和调试阶段到今天为止，单纯就“本地服务”来说，应该有比 Nginx/Apache 更轻量，更适合前端环境的 HTTP Server。
比如 [browser-sync](https://www.npmjs.com/package/browser-sync) , 比如我们的 [Horn](https://www.npmjs.com/package/horn)

![horn](http://gw.alicdn.com/tfscom/TB1ToQZIVXXXXbNXFXXtgIpNVXX-400-300.jpg)

非常感谢以下开源项目：

* [ecstatic](https://www.npmjs.com/package/ecstatic)
* [union](https://www.npmjs.com/package/union)
* [http-proxy](https://www.npmjs.com/package/http-proxy)
* [flex-combo](https://www.npmjs.com/package/flex-combo)
* [flex-hosts](https://www.npmjs.com/package/flex-hosts)


## Usage

#### CLI

```
$ npm install -g horn
```

```
  Usage: horn [options]

  Options:

    -h, --help                output usage information
    -V, --version             output the version number
    -r, --root <dir>          root of horn static server, default `./`
    -c, --cache <sec>         cache time(seconds) of static file, default `3600`
    -D, --dontShowDir         do not show dir when server running
    -A, --dontAutoIndex       do not serve file with name `index` such as `index.html` automatic
    -t, --contentType <type>  default contentType of file
    -e, --ext <ext>           default ext of file `html`
    -C, --cors                enable HTTP access control(CORS)
    -p, --proxy <ip>          set http-proxy with specific ip
    -s, --https               enable https server
    -H, --host <host>         server host by horn, default (127.0.0.1)
    -P, --port <port>         server port by horn, default (9999)
    -f, --hornfile <path>     `hornfile` path to set more configuration
```

#### API

```
var Horn = require('horn');

// all params are optional...
var param = {
  root: './',
  cache: 3600,
  showDir: true,
  autoIndex: true,
  contentType: 'application/octet-stream',
  ext: 'html',
  cors: false,
  proxy: null, // eg. '10.12.230.112'
  https: false,
  host: '127.0.0.1',
  port: 9999,
  hornfile: null, // eg. `./config/hornfile.js`
  headers: {},
  before: [function (req, res, err) { ... }, function (req, res, err) { ... }],
  log: function(req, res, error) {
    var log = console.log;
    var date = (new Date).toUTCString();
    if (error) {
      log('[%s] "%s %s" Error (%s): "%s"', date, req.method, req.url, error.status.toString(), error.message);
    } else {
      log('[%s] "%s %s" "%s"', date, req.method, req.url, req.headers['user-agent']);
    }
  }
}

var hornServer = new Horn(param);
//create server
hornServer.createServer();
// flex hosts, modify hosts to enable local map automatic
hornServer.flexHosts();
// enable flex combo
hornServer.flexCombo();

```


## Quick Start

#### 随启随用，支持任意目录为根目录的HTTP Server

在任意目录执行

```
$ horn
```

http server 就默认在当前目录，默认端口9999 启动起来了

![img](http://gw.alicdn.com/tfscom/TB1AjBeJXXXXXaeXXXXkfVp7FXX-1332-660.png_600x600s150.jpg)

当然，和其他社区主流的静态 HTTP Server 一样，提供了开发中常用的设置和功能，具体参考`horn -h`帮助，包括：

* 可在任意目录启用，也可在任意目录指定其他目录为服务根目录
* 可指定任意端口作为静态服务端口。（如果使用了80或者443端口会占用flex-combo的localmap本地映射服务端口）
* 可指定 cache 时间
* 可指定是否显示文件和文件夹列表
* 可指定是否自动把带`index`名的文件渲染
* 可指定默认的文件`contentType`
* 可指定默认服务的文件后缀名
* 可指定是否设置文件跨域HTTP头
* 可设置代理服务的ip
* 可指定是否是Https的服务，需要对应的证书和key
* 可指定本地服务默认的host
* 可指定启用本地服务的端口
* 可指定Horn服务的配置文件路径，默认会去找服务根路径下的 `hornfile` 或者 `hornfile.js`
* 作为module使用可以配置请求需要显示的log信息
* 作为module使用可以配置http headers
* 作为module使用可以配置基于请求头和响应体的处理中间件

具体的使用参数见Usage。


#### 线上文件的本地映射

Horn 除了是一个常见的HTTP 静态Server之外，还默认集成了线上文件映射本地文件，LocalMap 的反向代理服务。基于 [Flex-Combo](https://www.npmjs.com/package/flex-combo)

启用和配置资源映射很简单，无需手动修改hosts文件，只要在Horn 提供静态服务的根目录存在`hornfile.js` 的配置文件，并且里面有`localMap`的配置，就会自动启动flex-combo的服务，解cdncombo，并且代理到指定文件夹或者文件。

比如 `hornfile.js` 配置：

```
module.exports = {
  localMap: {
    'g.alicdn.com': {
      '/mtb/lib-flexible/0.3.2/': 'js/'
    },
    'g.tbcdn.cn': {
      '/mtb/lib-env/1.5.0/env.js': 'js/env-local.js'
    }
  }
}
```

那么，只要在当前静态服务下有页面请求匹配以上配置，比如

```
<script src="http://g.alicdn.com/mtb/??lib-flexible/0.3.2/flexible.js"></script>
<script src="http://g.tbcdn.cn/mtb/??lib-env/1.5.0/env.js,lib-login/1.4.3/login.js,lib-mtop/1.6.4/mtop.js"></script>
```

第一个script请求的flexible.js 会优先去找`hornfile.js`中配置的相对路径`js/`（相对于hornfile.js本身）目录下的同名flexible.js 文件，如果存在，会返回本地文件响应，不存在会直接回溯到线上。

同时，可以解开cdncombo做文件的单独代理，例如第二个script里面一个cdncombo链接里面combo了好几个js文件，但是`hornfile.js` 中 LocalMap只配置了`env.js` 有映射关系，所以会在解开cdncombo链接的基础上，只映射env.js匹配的文件，其他没有匹配的仍然回溯到线上。

`hornfile.js` 中除了配置 `localMap`外，自然也支持所有静态HTTP Server 可配的参数，比如：

```

module.exports = {
  root: './www',
  headers: {
    'http-access-control': '*'
  },
  cache: 3600, //sec
  showDir: true,
  autoIndex: true,
  contentType: 'application/octet-stream',
  ext: 'html',
  cors: false,
  proxy: null,
  https: false,
  log: function (req, res, err) {
    console.log(req.toString(), res.toString());
  },
  before: [
    function (req, res, err) {
      // middleware
    }
  ],

  localMap: {
    'g.alicdn.com': {
      '/mtb/lib-flexible/0.3.2/': 'js/'
    },
    'g.tbcdn.cn': {
      '/mtb/lib-env/1.5.0/env.js': 'js/4444.js'
    }
  }
}
```


