FormRenderer.Validators.NumberValidator =
  validate: (model) ->
    value = model.get('value')
    units = model.get('field_options.units')

    value = value.
              replace(/,/g, '').
              replace(/-/g, '').
              replace(/^\+/, '').
              trim()

    if units
      value = value.replace(new RegExp(units + '$', 'i'), '').trim()

    unless value.match(/^-?\d*(\.\d+)?$/)
      'number'
