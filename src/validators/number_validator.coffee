FormRenderer.Validators.NumberValidator =
  validate: (model) ->
    value = model.get('value')
    value = value.replace(/,/g, '')
                 .replace(/-/g, '')
                 .replace(/^\+/, '')

    unless value.match(/^-?\d*(\.\d+)?$/)
      'number'
