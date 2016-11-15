FormRenderer.Models.NonInputResponseField = FormRenderer.Models.ResponseField.extend
  input_field: false
  validate: ->

for i in FormRenderer.NON_INPUT_FIELD_TYPES
  FormRenderer.Models["ResponseField#{_str.classify(i)}"] = FormRenderer.Models.NonInputResponseField.extend
    field_type: i

FormRenderer.Views.NonInputResponseField = FormRenderer.Views.ResponseField.extend
  render: ->
    @$el.html JST['partials/non_input_response_field'](@)
    @form_renderer?.trigger 'viewRendered', @
    @

for i in FormRenderer.NON_INPUT_FIELD_TYPES
  FormRenderer.Views["ResponseField#{_str.classify(i)}"] = FormRenderer.Views.NonInputResponseField.extend
    field_type: i
