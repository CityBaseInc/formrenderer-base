FormRenderer.Views.Page = Backbone.View.extend
  className: 'fr_page'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @models = []
    @views = []

  render: ->
    @hide()

    for rf in @models
      if rf.group
        view = new FormRenderer.Views.RepeatingGroup(
          model: rf,
          form_renderer: @form_renderer
        )
      else
        view = new FormRenderer.Views["ResponseField#{_str.classify(rf.field_type)}"](
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
    for rf in @models
      if rf.input_field
        rf.validate()

      if rf.group
        for entry in rf.entries
          entry.formComponents.each (component) =>
            component.validate()

  firstViewWithError: ->
    _.find @views, (view) ->
      view.model.errors.length > 0
