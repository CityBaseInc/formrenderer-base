_isPageButton = (el) ->
  el && (el.hasAttribute('data-fr-next-page') || el.hasAttribute('data-fr-previous-page'))

FormRenderer.Models.ResponseField = FormRenderer.Models.BaseFormComponent.extend
  input_field: true
  wrapper: 'label'
  field_type: undefined
  validators: []

  afterInitialize: ->
    @errors = []

    @calculateVisibility()

    if @hasLengthValidations()
      @listenTo @, 'change:value', @calculateLength

  validate: (opts = {}) ->
    errorWas = @get('error')
    @errors = []

    return unless @isVisible

    # Presence is a special-case, since it will stop us from running any other validators
    if !@hasValue()
      @errors.push(FormRenderer.t.errors.blank) if @isRequired()
    else
      # If value is present, run all the other validators
      for validator in @validators
        errorKey = validator.validate(@)
        @errors.push(FormRenderer.t.errors[errorKey]) if errorKey

    errorIs = @getError()

    if opts.clearOnly && errorWas != errorIs
      @set 'error', null
    else
      @set 'error', @getError()

    @fr.trigger('afterValidate afterValidate:one', @)

  getError: ->
    @errors.join(' ') if @errors.length > 0

  hasLengthValidations: ->
    (FormRenderer.Validators.MinMaxLengthValidator in @validators) &&
    (@get('minlength') || @get('maxlength'))

  calculateLength: ->
    @set(
      'currentLength',
      FormRenderer.getLength @getLengthValidationUnits(), @get('value')
    )

  hasMinMaxValidations: ->
    (FormRenderer.Validators.MinMaxValidator in @validators) &&
    (@get('min') || @get('max'))

  getLengthValidationUnits: ->
    @get('min_max_length_units') || 'characters'

  setExistingValue: (x) ->
    @set('value', x) if x
    @calculateLength() if @hasLengthValidations()

  getValue: ->
    @get('value')

  # used for conditionals
  toText: ->
    @getValue()

  hasValue: ->
    !!@get('value')

  hasAnyValueInHash: ->
    _.some @get('value'), (v, k) ->
      !!v

  hasValueHashKey: (keys) ->
    _.some keys, (key) =>
      !!@get("value.#{key}")

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
    @form_renderer = options.form_renderer

    if @form_renderer
      @showLabels = @form_renderer.options.showLabels
    else
      @showLabels = options.showLabels

    @model = options.model
    @listenTo @model, 'afterValidate', @render
    @listenTo @model, 'change', @_onInput
    @listenTo @model, 'change:currentLength', @auditLength
    @listenTo @model, 'change:error', @toggleErrorModifier
    @$el.addClass "fr_response_field_#{@model.field_type}"

    if @model.id
      @$el.addClass("fr_response_field_#{@model.id}")

  getDomId: ->
    @model.cid

  reflectConditions: ->
    if @model.isVisible
      @$el.show()
    else
      @$el.hide()

  _onBlur: (e) ->
    # Only run if the value is present
    if @model.hasValue()
      # This is the best method we have for getting the new active element.
      # See http://stackoverflow.com/questions/121499/
      setTimeout =>
        newActive = document.activeElement

        unless $.contains(@el, newActive)
          if _isPageButton(newActive)
            $(document).one 'mouseup', => @model.validate()
          else
            @model.validate()
      , 1

  # Run validations on change if there are errors
  _onInput: ->
    if @model.errors.length > 0
      @model.validate(clearOnly: true)

  focus: ->
    @$el.find(':input:eq(0)').focus()

  auditLength: ->
    return unless @model.hasLengthValidations()
    return unless ($lc = @$el.find('.fr_length_counter'))[0]

    validation = FormRenderer.Validators.MinMaxLengthValidator.validate(@model)

    if validation == 'short'
      $lc.addClass('is_short').removeClass('is_long')
    else if validation == 'long'
      $lc.addClass('is_long').removeClass('is_short')
    else
      $lc.removeClass('is_short is_long')

  toggleErrorModifier: ->
    @$el[if @model.getError() then 'addClass' else 'removeClass']('error')

  render: ->
    @$el.html JST['partials/response_field'](@)
    rivets.bind @$el, { model: @model }
    @auditLength()
    @form_renderer?.trigger 'viewRendered', @
    @
