FormRenderer.Models.ResponseFieldIdentification = FormRenderer.Models.ResponseField.extend
  field_type: 'identification'
  valueType: 'hash'
  isRequired: -> true
  validateType: ->
    if !@get('value.email') || !@get('value.name')
      'identification'
    else if !@get('value.email').match(FormRenderer.EMAIL_REGEX)
      'email'

FormRenderer.Views.ResponseFieldIdentification = FormRenderer.Views.ResponseField.extend
  field_type: 'identification'

  disableInput: ->
    @isInputDisabled = true

