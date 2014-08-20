class FormRenderer.Validators.NumberValidator extends FormRenderer.Validators.BaseValidator
  @VALID_REGEX: /^-?\d*(\.\d+)?$/

  validate: ->
    return unless @model.field_type == 'number'

    value = @model.get('value')
    value = value.replace(/,/g, '')
                 .replace(/-/g, '')
                 .replace(/^\+/, '')

    unless value.match(@constructor.VALID_REGEX)
      'not a valid number'
