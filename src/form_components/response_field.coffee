_isPageButton = (el) ->
  el && (el.hasAttribute('data-fr-next-page') || el.hasAttribute('data-fr-previous-page'))

FormRenderer.Models.ResponseField = FormRenderer.Models.BaseFormComponent.extend
  input_field: true
  wrapper: 'label'
  field_type: undefined
  validators: []

  ignoreKeysWhenCheckingPresence: ->
    []

  initialize: ->
    FormRenderer.Models.BaseFormComponent::initialize.apply @, arguments

    @errors = []

    if @hasLengthValidation()
      @listenTo @, 'change:value', @calculateLength

  getError: ->
    @errors.join(' ') if @errors.length > 0

  calculateLength: ->
    @set(
      'currentLength',
      FormRenderer.getLength @getLengthValidationUnits(), @get('value')
    )

  getLengthValidationUnits: ->
    @get('min_max_length_units') || 'characters'

  setExistingValue: (x) ->
    @set('value', x) if x
    @calculateLength() if @hasLengthValidation()

  getValue: ->
    @get('value') || @defaultValue()

  defaultValue: ->
    if @valueType == 'hash'
      {}

  # used for conditionals
  toText: ->
    @getValue()

  hasValue: ->
    if @valueType == 'hash'
      _.some (@get('value') || {}), (v, k) =>
        !(k in @ignoreKeysWhenCheckingPresence()) && !!v
    else
      !!@get('value')

  getOptions: ->
    @get('options') || []

  getColumns: ->
    @get('columns') || []

  getSize: ->
    @get('size') || 'small'

  sizeToHeaderTag: ->
    {
      large: 'h2'
      medium: 'h3'
      small: 'h4'
    }[@getSize()]


FormRenderer.Views.ResponseField = Backbone.View.extend
  className: 'fr_response_field'
  events:
    'blur input, textarea, select': '_onBlur'

  initialize: (options) ->
    @_sharedInitialize(options)

    @listenTo @model, 'afterValidate', @render
    @listenTo @model, 'change', @_onInput
    @listenTo @model, 'change:currentLength', @auditLength
    @listenTo @model, 'change:error', @toggleErrorModifier
    @$el.addClass "fr_response_field_#{@model.field_type}"

  _onBlur: (e) ->
    # Only run if the value is present
    if @model.hasValue()
      # This is the best method we have for getting the new active element.
      # See http://stackoverflow.com/questions/121499/
      setTimeout =>
        newActive = document.activeElement

        unless $.contains(@el, newActive)
          if _isPageButton(newActive)
            $(document).one 'mouseup', => @model.validateComponent()
          else
            @model.validateComponent()
      , 1

  # Run validations on change if there are errors
  _onInput: ->
    if @model.errors.length > 0
      @model.validateComponent(clearOnly: true)

  focus: ->
    @$el.find(':input:eq(0)').focus()

  auditLength: ->
    return unless @model.hasLengthValidation()
    return unless ($lc = @$el.find('.fr_length_counter'))[0]

    validationRes = @model.validateLength()

    if validationRes == 'short'
      $lc.addClass('is_short').removeClass('is_long')
    else if validationRes == 'long'
      $lc.addClass('is_long').removeClass('is_short')
    else
      $lc.removeClass('is_short is_long')

  toggleErrorModifier: ->
    @$el[if @model.getError() then 'addClass' else 'removeClass']('error')

  partialName: ->
    if @model.input_field
      'response_field'
    else
      'non_input_response_field'

  render: ->
    @$el.html JST["partials/#{@partialName()}"](@)
    rivets.bind @$el, { model: @model }
    @auditLength()
    @form_renderer?.trigger 'viewRendered', @
    @

  # This is a helper method designed to be used ONLY from formbuilder.
  # FormBuilder doesn't have access to a full formrenderer context, so
  # the field collection is passed directly into this helper.
  isHidden: (fieldCollection) ->
    if @get('admin_only') == true
      true
    else if @isConditional()
      visible = _[@conditionMethod()] @getConditions(), (condition) =>
        (new FormRenderer.ConditionChecker(
          null,
          condition,
          fieldCollection.get(condition.response_field_id)
        )).isVisible()
      !visible
    else
      false
