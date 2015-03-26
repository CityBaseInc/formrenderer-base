FormRenderer.Validators.MinMaxValidator =
  validate: (model) ->
    return unless model.get('field_options.min') || model.get('field_options.max')

    min = model.get('field_options.min') && parseFloat(model.get('field_options.min'))
    max = model.get('field_options.max') && parseFloat(model.get('field_options.max'))

    value = if model.field_type == 'price'
      parseFloat("#{model.get('value.dollars') || 0}.#{model.get('value.cents') || 0}")
    else
      parseFloat(model.get('value').replace(/,/g, ''))

    if min && value < min
      'too_small'
    else if max && value > max
      'too_large'
