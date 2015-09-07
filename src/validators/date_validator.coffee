FormRenderer.Validators.DateValidator =
  validate: (model) ->
    if model.get('field_options.date_format') == 'month_day'
      year = 2000 # Just a dummy constant
    else
      year = parseInt(model.get('value.year'), 10) || 0

    day = parseInt(model.get('value.day'), 10) || 0
    month = parseInt(model.get('value.month'), 10) || 0

    febDays = if new Date(year, 1, 29).getMonth() == 1
                29
              else
                28

    daysPerMonth = [31, febDays, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    maxDays = daysPerMonth[month - 1]

    unless (year > 0) && (0 < month <= 12) && (0 < day <= maxDays)
      'date'
