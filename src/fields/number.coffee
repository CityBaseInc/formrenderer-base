FormRenderer.Validators.NumberValidator =
  validate: (model) ->
    normalized = FormRenderer.normalizeNumber(
      model.get('value'),
      model.get('units')
    )

    unless normalized.match(/^-?\d*(\.\d+)?$/)
      'number'

FormRenderer.Views.ResponseFieldNumber = FormRenderer.Views.ResponseField.extend
  field_type: 'number'

FormRenderer.Models.ResponseFieldNumber = FormRenderer.Models.ResponseField.extend
  validators: [
    FormRenderer.Validators.NumberValidator
    FormRenderer.Validators.MinMaxValidator
    FormRenderer.Validators.IntegerValidator
  ]
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
