module.exports = (function() {

  'use strict';

  const Application = require('./application.js');
  const dummyRouter = require('./dummy_router.js');

  const fs = require('fs');

  class Daemon {

    constructor(path) {

      this._path = path;
      this._watchers = null;

      this._onStart = function() {};

    }

    start(callback) {

      callback = typeof callback === 'function' ? callback : this._onStart;
      this._onStart = callback;

      let self = this;
      let init = function() {

        if ((process.env.NODE_ENV || 'development') === 'development') {
          self.watch('', self.restart.bind(self));
        }

        callback.call(self, this);

      };

      try {

        let App = require(process.cwd() + '/' + this._path);

        if (!(Application.prototype.isPrototypeOf(App.prototype))) {
          throw new Error('Daemon requires valid Nodal.Application');
        }

        App.prototype.__initialize__ = init;
        this._app = new App();

      } catch(err) {

        class DummyApp extends Application {

          __setup__() {

            this.useRouter(dummyRouter(err));

          }

        }

        DummyApp.prototype.__initialize__ = init;
        this._app = new DummyApp();

      }

    }

    restart() {

      this.stop(this.start);

    }

    stop(onStop) {

      this.unwatch();

      let cwd = process.cwd();

      Object.keys(require.cache).filter(function(v) {
        return v.indexOf(cwd) === 0 &&
          v.substr(cwd.length).indexOf('/node_modules/') !== 0;
      }).forEach(function(key) {
        delete require.cache[key];
      });

      this._app.__destroy__(onStop.bind(this));

    }

    unwatch() {

      this._watchers && clearInterval(this._watchers.interval);
      this._watchers = null;

    }

    watch(path, onChange) {

      function watchDir(cwd, dirname, watchers) {

        if (!watchers) {

          watchers = Object.create(null);
          watchers.directories = Object.create(null);
          watchers.interval = null;

        }

        let path = [cwd, dirname].join('');
        let files = fs.readdirSync(path);

        watchers.directories[path] = Object.create(null);

        files.forEach(function(v) {

          if (v === 'node_modules' || v.indexOf('.git') === 0) {
            return;
          }

          let filename = [dirname, v].join('/');
          let fullPath = [cwd, filename].join('/');

          let stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            watchDir(cwd, filename, watchers);
            return;
          }

          watchers.directories[path][v] = stat;

        });

        return watchers;

      }

      let watchers = watchDir(process.cwd(), path || '');
      let self = this;

      watchers.iterate = function(changes) {

        changes.forEach(function(v) {
          console.log(v.event[0].toUpperCase() + v.event.substr(1) + ': ' + v.path);
        });

        if (changes.length) {
          watchers.interval && clearInterval(watchers.interval);
          onChange.call(self);
        }

      };

      watchers.interval = setInterval(function() {

        /* let t = new Date().valueOf();

        console.log('Checking project tree...'); */

        let changes = [];

        Object.keys(watchers.directories).forEach(function(dirPath) {

          let dir = watchers.directories[dirPath];
          let files = fs.readdirSync(dirPath);
          let added = [];

          let contents = Object.create(null);

          files.forEach(function(v) {

            if (v === 'node_modules' || v.indexOf('.git') === 0) {
              return;
            }

            let fullPath = [dirPath, v].join('/');
            let stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              return;
            }

            if (!dir[v]) {
              added.push([v, stat]);
              changes.push({event: 'added', path: fullPath});
              return;
            }

            if (stat.mtime.toString() !== dir[v].mtime.toString()) {
              dir[v] = stat;
              changes.push({event: 'modified', path: fullPath});
            }

            contents[v] = true;

          });

          Object.keys(dir).forEach(function(v) {

            let fullPath = [dirPath, v].join('/');

            if (!contents[v]) {
              delete dir[v];
              changes.push({event: 'removed', path: fullPath});
            }

          });

          added.forEach(function(v) {
            dir[v[0]] = v[1];
          });

        });

        watchers.iterate(changes);

        /* t = (new Date).valueOf() - t;

        console.log('Project tree walked. Took ' + t + 'ms'); */

      }, 1000);

      return this._watchers = watchers;

    }

  }

  return Daemon;

})();
