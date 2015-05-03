FormRenderer.Validators.PriceValidator =
  validate: (model) ->
    values = []

    if model.get('value.dollars')
      values.push(
        model.get('value.dollars').replace(/,/g, '').replace(/^\$/, '')
      )
    if model.get('value.cents')
      values.push(model.get('value.cents'))

    unless _.every(values, (x) -> x.match(/^-?\d+$/))
      'price'
