class FormRenderer.ConditionChecker
  constructor: (@form_renderer, @condition) ->
    @value = @responseField()?.toText() || ''

  method_eq: ->
    @value.toLowerCase() == @condition.value.toLowerCase()

  method_contains: ->
    @value.toLowerCase().indexOf(@condition.value.toLowerCase()) > -1

  method_not: ->
    !@method_eq()

  method_does_not_contain: ->
    !@method_contains()

  method_gt: ->
    parseFloat(@value) > parseFloat(@condition.value)

  method_lt: ->
    parseFloat(@value) < parseFloat(@condition.value)

  method_shorter: ->
    @length() < parseInt(@condition.value, 10)

  method_longer: ->
    @length() > parseInt(@condition.value, 10)

  length: ->
    FormRenderer.getLength(
      @responseField().getLengthValidationUnits(),
      @value
    )

  isValid: ->
    @responseField() &&
    _.all ['value', 'response_field_id', 'method'], (x) =>
      @condition[x]

  isVisible: ->
    if @isValid()
      @["method_#{@condition.method}"]()
    else
      true

  responseField: ->
    @form_renderer.response_fields.get(@condition.response_field_id)
