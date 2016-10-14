FormRenderer.Validators.MinMaxValidator =
  validate: (model) ->
    return unless model.get('min') || model.get('max')

    min = model.get('min') && parseFloat(model.get('min'))
    max = model.get('max') && parseFloat(model.get('max'))

    value = if model.field_type == 'price'
      parseFloat("#{model.get('value.dollars') || 0}.#{model.get('value.cents') || 0}")
    else
      parseFloat(model.get('value').replace(/,/g, ''))

    if min && value < min
      'small'
    else if max && value > max
      'large'
