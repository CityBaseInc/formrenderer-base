BottomBar = Backbone.View.extend
  events:
    'click [data-js-back]': 'handleBack'
    'click [data-js-continue]': 'handleContinue'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @listenTo @form_renderer.state, 'change:activePage change:hasChanges change:submitting change:hasServerErrors', @render

  render: ->
    @$el.html JST['plugins/bottom_bar'](@)
    @

  handleBack: (e) ->
    e.preventDefault()
    @form_renderer.activatePage @form_renderer.previousPage(), skipValidation: true

  handleContinue: (e) ->
    e.preventDefault()

    if @form_renderer.isLastPage() || !@form_renderer.options.enablePages
      @form_renderer.submit()
    else
      @form_renderer.activatePage(@form_renderer.nextPage())

class FormRenderer.Plugins.BottomBar extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    @fr.subviews.bottomBar = new BottomBar(form_renderer: @fr)
    @fr.$el.append @fr.subviews.bottomBar.render().el
