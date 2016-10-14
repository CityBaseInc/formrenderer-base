FormRenderer.Validators.PhoneValidator =
  validate: (model) ->
    isUs = model.get('phone_format') == 'us'

    # For US phone numbers, we validate the full 10-digit number.
    # For international numbers, our validation errs on relaxation :D
    minDigits = if isUs then 10 else 7

    digitsOnly = model.get('value').match(/\d/g)?.join('') || ''

    unless digitsOnly.length >= minDigits
      if isUs then 'us_phone' else 'phone'
