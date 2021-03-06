module.exports = (function() {

  "use strict";

  const Nodal = require('nodal');

  class Error404Controller extends Nodal.Controller {

    get(self, params, app) {
      self.status(404);
      self.render(app.template('error/404.html'), params);
    }

  }

  return Error404Controller;

})();
