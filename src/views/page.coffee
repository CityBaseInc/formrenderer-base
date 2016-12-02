FormRenderer.Views.Page = Backbone.View.extend
  className: 'fr_page'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @models = []
    @views = []

  render: ->
    @hide()

    for rf in @models
      view = FormRenderer.buildFormComponentView(rf, @form_renderer)
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
    component.validateComponent() for component in @models

  fieldViews: ->
    _.tap [], (arr) =>
      for view in @views
        if view.model.group
          if !view.model.isSkipped()
            for entry in view.model.entries
              for fieldView in entry.view.views
                arr.push(fieldView)
        else
          arr.push(view)

  firstViewWithError: ->
    _.find @fieldViews(), (view) ->
      view.model.errors.length > 0

  isVisible: ->
    !!_.find(@models, ((rf) -> rf.isVisible))

  isValid: ->
    !@firstViewWithError()
