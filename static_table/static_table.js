define(function (require) {
  // we need to load the css ourselves
  require('css!plugins/static_table/static_table.css');

  // we also need to load the controller and used by the template
  require('plugins/static_table/controllers/static_table_controller');

  function StaticTabletVisProvider(Private) {
    var TemplateVisType = Private(require('plugins/vis_types/template/template_vis_type'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'Static Table',
      title: 'Static table widget',
      icon: 'fa-code',
      description: 'Static table widget used to present static data.',
      template: require('text!plugins/static_table/static_table.html'),
      params: {
        defaults: {
          resultLimit: 1
        },
        editor: require('text!plugins/static_table/static_table_params.html')
      }
    });
  };
  
  return StaticTabletVisProvider;
});