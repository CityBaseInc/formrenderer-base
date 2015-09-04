FormRenderer.Validators.NumberValidator =
  validate: (model) ->
    normalized = FormRenderer.normalizeNumber(
      model.get('value'),
      model.get('field_options.units')
    )

    unless normalized.match(/^-?\d*(\.\d+)?$/)
      'number'
