FormRenderer.Validators.MinMaxLengthValidator =
  validate: (model) ->
    return unless model.get('field_options.minlength') || model.get('field_options.maxlength')

    min = parseInt(model.get('field_options.minlength'), 10) || undefined
    max = parseInt(model.get('field_options.maxlength'), 10) || undefined

    count = FormRenderer.getLength model.getLengthValidationUnits(), model.get('value')

    if min && count < min
      'too_short'
    else if max && count > max
      'too_long'
