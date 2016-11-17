FormRenderer.Models.ResponseFieldIdentification = FormRenderer.Models.ResponseField.extend
  field_type: 'identification'
  isRequired: -> true
  hasValue: ->
    @hasValueHashKey ['email', 'name']
  validateType: ->
    if !@get('value.email') || !@get('value.name')
      'identification'
    else if !@get('value.email').match(FormRenderer.EMAIL_REGEX)
      'email'
