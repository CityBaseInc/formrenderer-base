FormRenderer.Validators.IntegerValidator =
  validate: (model) ->
    return unless model.get('field_options.integer_only')

    unless model.get('value').match(/^-?\d+$/)
      'integer'
