
module.exports = {
  //root: 'mtb',
  headers: {},
  cache: 3600, //sec
  showDir: true,
  autoIndex: true,
  contentType: 'application/octet-stream',
  ext: 'html',
  cors: false,
  proxy: null,
  https: false,

  localMap: {
    'g.alicdn.com': {
      '/mtb/lib-flexible/0.3.2/': 'js/'
    },
    'g.tbcdn.cn': {
      '/mtb/lib-env/1.5.0/env.js': 'js/4444.js'
    }
  }
}