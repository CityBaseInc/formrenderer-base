class FormRenderer.Validators.IntegerValidator extends FormRenderer.Validators.BaseValidator
  @VALID_REGEX: /^-?\d+$/

  validate: ->
    return unless @model.get('field_options.integer_only')

    unless @model.get('value').match(@constructor.VALID_REGEX)
      'invalid_integer'
