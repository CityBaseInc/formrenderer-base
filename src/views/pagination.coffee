FormRenderer.Views.Pagination = Backbone.View.extend
  events:
    'click [data-activate-page]': (e) ->
      @form_renderer.activatePage(
        $(e.currentTarget).data('activate-page'),
        skipValidation: true
      )

  initialize: (options) ->
    { @form_renderer } = options
    @listenTo @form_renderer.state, 'change:activePage', @render
    @listenTo @form_renderer, 'afterValidate', @render

  render: ->
    @$el.html JST['partials/pagination'](@)
    @
