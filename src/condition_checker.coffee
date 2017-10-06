presenceMethods = ['present', 'blank']

class FormRenderer.ConditionChecker
  # ConditionChecker may be called from outside the FormRenderer context,
  # e.g. from FormBuilder. In that case, pass in @field instead of @form_renderer.
  # NOTE: For the next major release, we can decouple ConditionChecker from the
  # @form_renderer object altogether by just forcing all external callers to pass
  # in @field
  constructor: (@form_renderer, @condition, @field) ->
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

  method_present: ->
    !!@value.match(/\S/)

  method_blank: ->
    !@method_present()

  length: ->
    FormRenderer.getLength(
      @responseField().getLengthValidationUnits(),
      @value
    )

  isValid: ->
    @responseField() &&
    _.all(['response_field_id', 'method'], ( (x) => @condition[x] )) &&
    (@condition.method in presenceMethods || @condition['value'])

  isVisible: ->
    return true unless @isValid()

    if @condition.method in presenceMethods
      @["method_#{@condition.method}"]()
    else
      @method_present() &&
      @["method_#{@condition.method}"]()

  responseField: ->
    @field || @form_renderer.response_fields.get(@condition.response_field_id)
