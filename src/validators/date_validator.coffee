FormRenderer.Validators.DateValidator =
  validate: (model) ->
    year = parseInt(model.get('value.year'), 10) || 0
    day = parseInt(model.get('value.day'), 10) || 0
    month = parseInt(model.get('value.month'), 10) || 0

    unless (year > 0) && (0 < day <= 31) && (0 < month <= 12)
      'date'
