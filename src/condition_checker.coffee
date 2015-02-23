class FormRenderer.ConditionChecker
  constructor: (@form_renderer, @condition) ->
    @value = @responseField().toText() || ''

  method_eq: ->
    @value.toLowerCase() == @condition.value.toLowerCase()

  method_contains: ->
    !!@value.toLowerCase().match(@condition.value.toLowerCase())

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
    _.all ['value', 'action', 'response_field_id', 'method'], (x) =>
      @condition[x]

  isVisible: ->
    if @isValid()
      @actionBool() == @["method_#{@condition.method}"]()
    else
      true

  actionBool: ->
    @condition.action == 'show'

  responseField: ->
    @form_renderer.response_fields.get(@condition.response_field_id)
