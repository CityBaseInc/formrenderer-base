FormRenderer.Validators.TimeValidator =
  validate: (model) ->
    hours = parseInt(model.get('value.hours'), 10) || 0
    minutes = parseInt(model.get('value.minutes'), 10) || 0
    seconds = parseInt(model.get('value.seconds'), 10) || 0

    unless (1 <= hours <= 12) && (0 <= minutes <= 60) && (0 <= seconds <= 60)
      'time'
