class FormRenderer.Plugins.ErrorBar extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    @fr.subviews.errorBar = new FormRenderer.Plugins.ErrorBar.View(form_renderer: @fr)
    @fr.$el.prepend @fr.subviews.errorBar.render().el

FormRenderer.Plugins.ErrorBar.View = Backbone.View.extend
  events:
    'click a': (e) ->
      e.preventDefault()
      @form_renderer.focusFirstError()

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @listenTo @form_renderer, 'afterValidate:all', @render

    # When validating a single field, we only go from shown -> hidden
    @listenTo @form_renderer, 'afterValidate:one', ->
      if @form_renderer.areAllPagesValid()
        @render()

  render: ->
    @$el.html JST['plugins/error_bar'](@)
    @form_renderer.trigger 'viewRendered', @

    unless @form_renderer.areAllPagesValid()
      window.scrollTo(0, @$el.offset().top - @form_renderer.options.scrollToPadding)

    @
