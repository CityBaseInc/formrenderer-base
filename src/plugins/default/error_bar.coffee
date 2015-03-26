class FormRenderer.Plugins.ErrorBar extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    @fr.subviews.errorBar = new FormRenderer.Plugins.ErrorBar.View(form_renderer: @fr)
    @fr.$el.prepend @fr.subviews.errorBar.render().el

FormRenderer.Plugins.ErrorBar.View = Backbone.View.extend
  initialize: (options) ->
    @form_renderer = options.form_renderer
    @listenTo @form_renderer, 'afterValidate', @render

  render: ->
    @$el.html JST['plugins/error_bar'](@)
    @form_renderer.trigger 'viewRendered', @

    unless @form_renderer.areAllPagesValid()
      # @todo scroll to first error? show correct page?
      window.scrollTo(0, @$el.offset().top - 10)

    @
