FormRenderer.Validators.IntegerValidator =
  validate: (model) ->
    return unless model.get('field_options.integer_only')

    normalized = FormRenderer.normalizeNumber(
      model.get('value'),
      model.get('field_options.units')
    )

    unless normalized.match(/^-?\d+$/)
      'integer'
