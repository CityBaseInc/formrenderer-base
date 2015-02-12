class FormRenderer.Validators.IdentificationValidator extends FormRenderer.Validators.BaseValidator
  validate: ->
    if !@model.get('value.name') || !@model.get('value.email')
      'please enter your name and email'
    else if !@model.get('value.email').match('@')
      'email is invalid'
