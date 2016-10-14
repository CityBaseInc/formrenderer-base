FormRenderer.Validators.NumberValidator =
  validate: (model) ->
    normalized = FormRenderer.normalizeNumber(
      model.get('value'),
      model.get('units')
    )

    unless normalized.match(/^-?\d*(\.\d+)?$/)
      'number'
