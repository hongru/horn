// hornfile
var fs = require('fs');
var path = require('path');
var cwd = process.cwd();

var HornFile = function (root) {
  this.root = root || cwd;

  this._getHornfile();
  this.exists = !!this.hornfile;
  if (this.exists) {
    try {
      this.content = this.resolve(require(this.hornfile));
    }catch(e) {
      console.log('Invalid Hornfile!');
    }
  }

}

HornFile.prototype = {
  _getHornfile: function () {
    var root = this.root;
    var hornfileJs = path.join(root, 'hornfile.js');
    var hornfile = path.join(root, 'hornfile');

    if (fs.existsSync(hornfile)) {
      this.hornfile = path.resolve(hornfile);
    } else if (fs.existsSync(hornfileJs)) {
      this.hornfile = path.resolve(hornfileJs);
    } else {
      this.hornfile = null;
    }

    return this.hornfile;
  },
  resolve: function (json) {
    var oldRoot = json.root;
    if (oldRoot) {
      json.root = path.resolve(this.root, oldRoot);
    }
    if (json.localMap) {
      for (var k in json.localMap) {
        var ruleObj = json.localMap[k];
        if (ruleObj) {
          for (var r in ruleObj) {
            ruleObj[r] = path.resolve(this.root, ruleObj[r]);
          }
        }
      }
    }

    return json;
  }
}

module.exports = HornFile;