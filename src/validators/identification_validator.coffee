class FormRenderer.Validators.IdentificationValidator extends FormRenderer.Validators.BaseValidator
  validate: ->
    if !@model.get('value.name') || !@model.get('value.email')
      'blank'
    else if !@model.get('value.email').match('@')
      'invalid_email'
