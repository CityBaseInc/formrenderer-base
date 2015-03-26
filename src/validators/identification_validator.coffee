FormRenderer.Validators.IdentificationValidator =
  validate: (model) ->
    if !model.get('value.name') || !model.get('value.email')
      'blank'
    else if !model.get('value.email').match('@')
      'invalid_email'
