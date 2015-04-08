FormRenderer.Validators.IdentificationValidator =
  validate: (model) ->
    if !model.get('value.email') || !model.get('value.name')
      'identification'
    else if !model.get('value.email').match('@')
      'email'
