define(function (require) {
  require('registry/vis_types').register(function (Private) {
    return Private(require('plugins/static_table/static_table'));
  });
});