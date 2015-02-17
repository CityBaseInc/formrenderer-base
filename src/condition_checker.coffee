class FormRenderer.ConditionChecker
  constructor: (@form_renderer, @condition) ->

  method_eq: ->
    @value() == @condition.value

  method_contains: ->
    !!(@value() || '').match(@condition.value)

  method_gt: ->
    parseFloat(@value()) > parseFloat(@condition.value)

  method_lt: ->
    parseFloat(@value()) < parseFloat(@condition.value)

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

  value: ->
    @responseField().toText()
