FormRenderer.Validators.PriceValidator =
  validate: (model) ->
    values = []

    values.push(model.get('value.dollars').replace(/,/g, '')) if model.get('value.dollars')
    values.push(model.get('value.cents')) if model.get('value.cents')

    unless _.every(values, (x) -> x.match(/^-?\d+$/))
      'invalid_price'
