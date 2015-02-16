FormRenderer.Views.ErrorAlertBar = Backbone.View.extend
  initialize: (options) ->
    @form_renderer = options.form_renderer
    @listenTo @form_renderer, 'afterValidate', @render

  render: ->
    @$el.html JST['partials/error_alert_bar'](@)

    unless @form_renderer.areAllPagesValid()
      window.scrollTo(0, @$el.offset().top - 10)

    @
