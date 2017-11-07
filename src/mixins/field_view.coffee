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

  # This method has been deprecated and is only around to alias to domId() for backwards-compatibility.
  getDomId: ->
    domId

_.extend FormRenderer.Views.ResponseFieldRepeatingGroup.prototype, FieldView
_.extend FormRenderer.Views.ResponseField.prototype, FieldView
