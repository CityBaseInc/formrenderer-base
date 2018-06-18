FormRenderer.Models.ResponseFieldIdentification = FormRenderer.Models.ResponseField.extend
  field_type: 'identification'
  valueType: 'hash'
  isRequired: -> true
  validateType: ->
    if !@get('value.email') || !@get('value.name')
      'identification'
    else if !@get('value.email').match(FormRenderer.EMAIL_REGEX)
      'email'

  getValue: ->
    if @fr?.isRenderingFollowUpForm()
      null
    else
      FormRenderer.Models.ResponseField::getValue.apply @, arguments


FormRenderer.Views.ResponseFieldIdentification = FormRenderer.Views.ResponseField.extend
  field_type: 'identification'

  disableInput: ->
    @isInputDisabled = true

  shouldRenderInputs: ->
    !!@isInputDisabled || @form_renderer?.isRenderingFollowUpForm()
