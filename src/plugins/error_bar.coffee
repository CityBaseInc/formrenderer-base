ErrorBar = Backbone.View.extend
  initialize: (options) ->
    @form_renderer = options.form_renderer
    @listenTo @form_renderer, 'afterValidate', @render

  render: ->
    @$el.html JST['plugins/error_bar'](@)

    unless @form_renderer.areAllPagesValid()
      window.scrollTo(0, @$el.offset().top - 10)

    @

class FormRenderer.Plugins.ErrorBar extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    @fr.subviews.errorBar = new ErrorBar(form_renderer: @fr)
    @fr.$el.prepend @fr.subviews.errorBar.render().el
