FormRenderer.Views.Pagination = Backbone.View.extend
  events:
    'click [data-activate-page]': (e) ->
      e.preventDefault()
      @form_renderer.activatePage(
        $(e.currentTarget).data('activate-page')
      )

  initialize: (options) ->
    { @form_renderer } = options
    @listenTo @form_renderer.state, 'change:activePage', @render
    @listenTo @form_renderer, 'afterValidate', @render

  render: ->
    @$el.html JST['partials/pagination'](@)
    @form_renderer.trigger 'viewRendered', @
    @
