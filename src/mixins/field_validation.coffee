FieldValidation =
  validateType: ->

  validationFns: [
    'validateType'
    'validateInteger'
    'validateLength'
    'validateMinMax'
  ]

  validateComponent: (opts = {}) ->
    errorWas = @get('error')
    @errors = []

    return unless @isVisible

    # Presence is a special-case, since it will stop us from running any other validators
    if !@hasValue()
      @errors.push(FormRenderer.t.errors.blank) if @isRequired()
    else
      # If value is present, run all the other validators
      for validationFn in @validationFns
        errorKey = @[validationFn]()
        @errors.push(FormRenderer.t.errors[errorKey]) if errorKey

    errorIs = @getError()

    if opts.clearOnly && errorWas != errorIs
      @set 'error', null
    else
      @set 'error', @getError()

    @fr.trigger('afterValidate afterValidate:one', @)

  hasIntegerValidation: ->
    @field_type == 'number' && @get('integer_only')

  validateInteger: ->
    return unless @hasIntegerValidation()

    normalized = FormRenderer.normalizeNumber(
      @get('value'),
      @get('units')
    )

    unless normalized.match(/^-?\d+$/)
      'integer'

  hasLengthValidation: ->
    (@field_type in ['text', 'paragraph']) &&
    (@get('minlength') || @get('maxlength'))

  validateLength: ->
    return unless @hasLengthValidation()

    min = parseInt(@get('minlength'), 10) || undefined
    max = parseInt(@get('maxlength'), 10) || undefined

    count = FormRenderer.getLength @getLengthValidationUnits(), @get('value')

    if min && count < min
      'short'
    else if max && count > max
      'long'

  hasMinMaxValidation: ->
    (@field_type in ['number', 'price']) &&
    (@get('min') || @get('max'))

  validateMinMax: ->
    return unless @hasMinMaxValidation()

    min = @get('min') && parseFloat(@get('min'))
    max = @get('max') && parseFloat(@get('max'))

    value = if @field_type == 'price'
      parseFloat("#{@get('value.dollars') || 0}.#{@get('value.cents') || 0}")
    else
      parseFloat(@get('value').replace(/,/g, ''))

    if min && value < min
      'small'
    else if max && value > max
      'large'

_.extend FormRenderer.Models.ResponseField.prototype, FieldValidation
