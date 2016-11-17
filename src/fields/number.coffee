FormRenderer.Models.ResponseFieldNumber = FormRenderer.Models.ResponseField.extend
  field_type: 'number'
  calculateSize: ->
    if (digitsInt = parseInt(@get('max'), 10))
      digits = "#{digitsInt}".length
    else
      digits = 6

    unless @get('integer_only')
      digits += 2

    if digits > 6
      'seven_plus'
    else if digits > 3
      'four_six'
    else
      'one_three'

  validateType: ->
    normalized = FormRenderer.normalizeNumber(@get('value'), @get('units'))

    unless normalized.match(/^-?\d*(\.\d+)?$/)
      'number'
