FormRenderer.Validators.IdentificationValidator =
  validate: (model) ->
    if !model.get('value.email') || !model.get('value.name')
      'identification'
    else if !model.get('value.email').match(FormRenderer.Validators.EmailValidator.VALID_REGEX)
      'email'

FormRenderer.Models.ResponseFieldIdentification = FormRenderer.Models.ResponseField.extend
  field_type: 'identification'
  validators: [FormRenderer.Validators.IdentificationValidator]
  isRequired: -> true
  hasValue: ->
    @hasValueHashKey ['email', 'name']

FormRenderer.Views.ResponseFieldIdentification = FormRenderer.Views.ResponseField
