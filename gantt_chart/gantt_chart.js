define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/gantt_chart/gantt_chart.css');

  // we also need to load the controller and used by the template
  require('plugins/gantt_chart/controllers/gantt_chart_controller');

  require('d3');

  require('plugins/gantt_chart/controllers/gantt_chart_d3v2');

  function GanttChartVisProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'Gantt Chart',
      title: 'Gantt chart widget',
      icon: 'fa-code',
      description: 'Gantt chart widget used to present static data.',
      template: require('text!plugins/gantt_chart/gantt_chart.html'),
      params: {
        defaults: {
          resultLimit: 1
        },
        editor: require('text!plugins/gantt_chart/gantt_chart_params.html')
      }
    });
  };
  
  return GanttChartVisProvider;
});