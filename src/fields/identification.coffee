FormRenderer.Models.ResponseFieldIdentification = FormRenderer.Models.ResponseField.extend
  field_type: 'identification'
  valueType: 'hash'
  isRequired: -> true
  validateType: ->
    if !@get('value.email') || !@get('value.name')
      'identification'
    else if !@get('value.email').match(FormRenderer.EMAIL_REGEX)
      'email'

  shouldPersistValue: ->
    if @fr?.isRenderingFollowUpForm()
      false
    else
      FormRenderer.Models.ResponseField::shouldPersistValue.apply @, arguments


  getValue: ->
    if @fr?.isRenderingFollowUpForm()
      null
    else
      FormRenderer.Models.ResponseField::getValue.apply @, arguments


FormRenderer.Views.ResponseFieldIdentification = FormRenderer.Views.ResponseField.extend
  field_type: 'identification'

  # Used internally by the Screendoor Formbuilder
  disableInput: ->
    @isInputDisabled = true

  dontRenderInputs: ->
    !!@isInputDisabled || @form_renderer?.isRenderingFollowUpForm()
