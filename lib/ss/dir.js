var ss = require('./ss'),
    fs = require('fs'),
    path = require('path'),
    he = require('he'),
    etag = require('./etag'),
    url = require('url'),
    status = require('./status-code');

module.exports = function (opts, stat) {
  // opts are parsed by opts.js, defaults already applied
  var cache = opts.cache,
      root = path.resolve(opts.root),
      baseDir = opts.baseDir,
      humanReadable = opts.humanReadable,
      handleError = opts.handleError,
      si = opts.si;

  return function middleware (req, res, next) {

    // Figure out the path for the file from the given url
    var parsed = url.parse(req.url),
        pathname = decodeURIComponent(parsed.pathname),
        dir = path.normalize(
          path.join(root,
            path.relative(
              path.join('/', baseDir),
              pathname
            )
          )
        );

    fs.stat(dir, function (err, stat) {
      if (err) {
        return handleError ? status[500](res, next, { error: err }) : next();
      }

      // files are the listing of dir
      fs.readdir(dir, function (err, files) {
        if (err) {
          return handleError ? status[500](res, next, { error: err }) : next();
        }
        res.setHeader('content-type', 'text/html');
        res.setHeader('etag', etag(stat));
        res.setHeader('last-modified', (new Date(stat.mtime)).toUTCString());
        res.setHeader('cache-control', cache);

        sortByIsDirectory(files, function (lolwuts, dirs, files) {
          // It's possible to get stat errors for all sorts of reasons here.
          // Unfortunately, our two choices are to either bail completely,
          // or just truck along as though everything's cool. In this case,
          // I decided to just tack them on as "??!?" items along with dirs
          // and files.
          //
          // Whatever.

          // if it makes sense to, add a .. link
          if (path.resolve(dir, '..').slice(0, root.length) == root) {
            return fs.stat(path.join(dir, '..'), function (err, s) {
              if (err) {
                return handleError ? status[500](res, next, { error: err }) : next();
              }
              dirs.unshift([ '..', s ]);
              render(dirs, files, lolwuts);
            });
          }
          render(dirs, files, lolwuts);
        });

        function sortByIsDirectory(paths, cb) {
          // take the listing file names in `dir`
          // returns directory and file array, each entry is
          // of the array a [name, stat] tuple
          var pending = paths.length,
              errs = [],
              dirs = [],
              files = [];

          if (!pending) {
            return cb(errs, dirs, files);
          }

          paths.forEach(function (file) {
            fs.stat(path.join(dir, file), function (err, s) {
              if (err) {
                errs.push([file, err]);
              }
              else if (s.isDirectory()) {
                dirs.push([file, s]);
              }
              else {
                files.push([file, s]);
              }

              if (--pending === 0) {
                cb(errs, dirs, files);
              }
            });
          });
        }

        function render(dirs, files, lolwuts) {
          // each entry in the array is a [name, stat] tuple

          // TODO: use stylessheets?
          var html = [
            '<!doctype html>',
            '<html>',
            '  <head>',
            '    <meta charset="utf-8">',
            '    <meta name="viewport" content="width=device-width">',
            '    <title>Index of ' + pathname +'</title>',
            '    <style>body{font-family:monospace}@font-face{font-family:iconfont;src:url(data:application/x-font-woff;charset=utf-8;base64,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) format("truetype")}.iconfont{font-family:iconfont!important;font-size:12px;font-style:normal;color:#333;-webkit-font-smoothing:antialiased;-webkit-text-stroke-width:.2px;-moz-osx-font-smoothing:grayscale}.icon-folder:before{content:"\e629"}.icon-file:before{content:"\e6c7"}</style>',
            '  </head>',
            '  <body>',
            '<h1>Index of ' + pathname + '</h1>'
          ].join('\n') + '\n';

          html += '<table>';

          var failed = false;
          var writeRow = function (file, i) {
            // render a row given a [name, stat] tuple
            var isDir = file[1].isDirectory && file[1].isDirectory();
            var href = parsed.pathname.replace(/\/$/, '') + '/' + encodeURI(file[0]);
            var textStyle = isDir ? ' style="font-weight:bold"' : '';

            // append trailing slash and query for dir entry
            if (isDir) {
              href += '/' + ((parsed.search)? parsed.search:'');
            }

            var displayName = he.encode(file[0]) + ((isDir)? '/':'');
            var icon = isDir ? '<i class="icon iconfont">&#xe74f;</i>' : '<i class="icon iconfont">&#xe606;</i>';
            
            html += '<tr>' +
              '<td><code>(' + permsToString(file[1]) + ')</code></td>' +
              '<td style="text-align: right; padding-left: 1em"><code>' + sizeToString(file[1], humanReadable, si) + '</code></td>' +
              '<td style="padding-left: 1em">'+icon+' <a href="' + href + '" '+ textStyle +'>' + displayName + '</a></td>' +
              '</tr>\n';
          };

          dirs.sort(function (a, b) { return a[0].toString().localeCompare(b[0].toString()); }).forEach(writeRow);
          files.sort(function (a, b) { return a.toString().localeCompare(b.toString()); }).forEach(writeRow);
          lolwuts.sort(function (a, b) { return a[0].toString().localeCompare(b[0].toString()); }).forEach(writeRow);

          html += '</table>\n';
          html += '<br><address>Node.js ' +
            process.version +
            ' | server @ ' +
            he.encode(req.headers.host || '') + ' by <a href="https://www.npmjs.com/package/horn"><strong>Horn</strong></a></address>\n' +
            '</body></html>'
          ;

          if (!failed) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(html);
          }
        }
      });
    });
  };
};

function permsToString(stat) {

  if (!stat.isDirectory || !stat.mode) {
    return '???!!!???';
  }

  var dir = stat.isDirectory() ? 'd' : '-',
      mode = stat.mode.toString(8);

  return dir + mode.slice(-3).split('').map(function (n) {
    return [
      '---',
      '--x',
      '-w-',
      '-wx',
      'r--',
      'r-x',
      'rw-',
      'rwx'
    ][parseInt(n, 10)];
  }).join('');
}

// given a file's stat, return the size of it in string
// humanReadable: (boolean) whether to result is human readable
// si: (boolean) whether to use si (1k = 1000), otherwise 1k = 1024
// adopted from http://stackoverflow.com/a/14919494/665507
function sizeToString(stat, humanReadable, si) {
    if (stat.isDirectory && stat.isDirectory()) {
      return '';
    }

    var sizeString = '';
    var bytes = stat.size;
    var threshold = si ? 1000 : 1024;

    if (!humanReadable || bytes < threshold) {
      return bytes + 'B';
    }

    var units = [ 'k','M','G','T','P','E','Z','Y' ];
    var u = -1;
    do {
        bytes /= threshold;
        ++u;
    } while (bytes >= threshold);

    var b = bytes.toFixed(1);
    if (isNaN(b)) b = '??';

    return b + units[u];
}