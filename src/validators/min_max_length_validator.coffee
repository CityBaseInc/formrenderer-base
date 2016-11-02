FormRenderer.Validators.MinMaxLengthValidator =
  validate: (model) ->
    return unless model.get('minlength') || model.get('maxlength')

    min = parseInt(model.get('minlength'), 10) || undefined
    max = parseInt(model.get('maxlength'), 10) || undefined

    count = FormRenderer.getLength model.getLengthValidationUnits(), model.get('value')

    if min && count < min
      'short'
    else if max && count > max
      'long'
