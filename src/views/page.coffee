FormRenderer.Views.Page = Backbone.View.extend
  className: 'fr_page'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @models = []
    @views = []

  render: ->
    @hide()

    for rf in @models
      view = new FormRenderer.Views["ResponseField#{_.str.classify(rf.field_type)}"](
        model: rf,
        form_renderer: @form_renderer
      )
      @$el.append view.render().el
      view.reflectConditions()
      @views.push view

    return @

  hide: ->
    @$el.hide()
    view.trigger('hidden') for view in @views

  show: ->
    @$el.show()
    view.trigger('shown') for view in @views

  reflectConditions: ->
    for view in @views
      view.reflectConditions()

  validate: ->
    for rf in _.filter(@models, ((rf) -> rf.input_field) )
      rf.validate()

  firstViewWithError: ->
    _.find @views, (view) ->
      view.model.errors.length > 0
