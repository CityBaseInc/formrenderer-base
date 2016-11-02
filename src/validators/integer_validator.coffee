FormRenderer.Validators.IntegerValidator =
  validate: (model) ->
    return unless model.get('integer_only')

    normalized = FormRenderer.normalizeNumber(
      model.get('value'),
      model.get('units')
    )

    unless normalized.match(/^-?\d+$/)
      'integer'
