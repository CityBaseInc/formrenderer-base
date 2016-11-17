FormRenderer.Models.ResponseFieldEmail = FormRenderer.Models.ResponseField.extend
  field_type: 'email'
  validateType: ->
    unless @get('value').match(FormRenderer.EMAIL_REGEX)
      'email'

