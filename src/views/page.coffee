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

  firstViewWithError: ->
    for _, view of @views
      if view.model.group
        if !view.model.isSkipped()
          for _, entry of view.model.entries
            for _, fieldView of entry.view.views
              return fieldView if fieldView.model.errors.length > 0
      else
        return view if view.model.errors.length > 0

    return undefined

  isVisible: ->
    !!_.find(@models, ((rf) -> rf.isVisible))

  isValid: ->
    !@firstViewWithError()
