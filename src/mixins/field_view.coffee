FieldView =
  _sharedInitialize: (options) ->
    { @form_renderer, @model } = options

    @$el.addClass("fr_response_field_#{@model.id}") if @model.id

    @showLabels = if @form_renderer
                    @form_renderer.options.showLabels
                  else
                    @showLabels = options.showLabels

  reflectConditions: ->
    if @model.isVisible
      @$el.show()
    else
      @$el.hide()

  domId: ->
    @model.cid

_.extend FormRenderer.Views.RepeatingGroup.prototype, FieldView
_.extend FormRenderer.Views.ResponseField.prototype, FieldView
