FormRenderer.Models.ResponseFieldPhone = FormRenderer.Models.ResponseField.extend
  field_type: 'phone'
  valueType: 'string'

  validateType: ->
    isUs = @get('phone_format') == 'us'

    # For US phone numbers, we validate the full 10-digit number.
    # For international numbers, our validation errs on relaxation :D
    minDigits = if isUs then 10 else 7

    digitsOnly = @get('value').match(/\d/g)?.join('') || ''

    unless digitsOnly.length >= minDigits
      if isUs then 'us_phone' else 'phone'

FormRenderer.Views.ResponseFieldPhone = FormRenderer.Views.ResponseField.extend
  phonePlaceholder: ->
    if @model.get('phone_format') == 'us'
      '(xxx) xxx-xxxx'
