BottomBarView = Backbone.View.extend
  events:
    'click [data-fr-previous-page]': (e) -> e.preventDefault(); @form_renderer.handlePreviousPage()
    'click [data-fr-next-page]': (e) -> e.preventDefault(); @form_renderer.handleNextPage()

  initialize: (options) ->
    @form_renderer = options.form_renderer

    @listenTo(
      @form_renderer.state,
      'change:activePage change:hasChanges change:submitting change:hasServerErrors',
      @render
    )

  render: ->
    @$el.html JST['plugins/bottom_bar'](@)
    @

class FormRenderer.Plugins.BottomBar extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    @fr.subviews.bottomBar = new BottomBarView(form_renderer: @fr)
    @fr.$el.append @fr.subviews.bottomBar.render().el
