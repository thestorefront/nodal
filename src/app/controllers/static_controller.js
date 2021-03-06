module.exports = (function() {

  "use strict";

  const Nodal = require('nodal');
  const Error404Controller = Nodal.require('app/controllers/error/404_controller.js');

  class StaticController extends Nodal.Controller {

    get(self, params, app) {

      let staticData = app.static(params.path[1]);

      if (!staticData) {
        Error404Controller.prototype.get.apply(this, arguments);
        return;
      }

      if (Nodal.my.Config.env === 'production') {
        self.setHeader('Cache-Control', 'max-age=60');
        self.setHeader('ETag', staticData.tag);
      }

      self.setHeader('Content-Type', staticData.mime);
      self.render(staticData.buffer);

    }

  }

  return StaticController;

})();
