FormRenderer.Validators.EmailValidator =
  validate: (model) ->
    unless model.get('value').match('@')
      'invalid_email'
