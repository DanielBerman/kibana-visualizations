define(function (require) {
  require('registry/vis_types').register(function (Private) {
    return Private(require('plugins/gantt_chart/gantt_chart'));
  });
});