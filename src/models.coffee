FormRenderer.Models.ResponseField = Backbone.DeepModel.extend
  input_field: true
  field_type: undefined
  validators: []
  sync: ->
  initialize: (_attrs, options = {}) ->
    { @form_renderer } = options

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

    @form_renderer.trigger('afterValidate afterValidate:one', @)

  isRequired: ->
    @get('required')

  getError: ->
    @errors.join(' ') if @errors.length > 0

  hasLengthValidations: ->
    (FormRenderer.Validators.MinMaxLengthValidator in @validators) &&
    (@get('field_options.minlength') || @get('field_options.maxlength'))

  calculateLength: ->
    @set(
      'currentLength',
      FormRenderer.getLength @getLengthValidationUnits(), @get('value')
    )

  hasMinMaxValidations: ->
    (FormRenderer.Validators.MinMaxValidator in @validators) &&
    (@get('field_options.min') || @get('field_options.max'))

  getLengthValidationUnits: ->
    @get('field_options.min_max_length_units') || 'characters'

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
    @get('field_options.options') || []

  getColumns: ->
    @get('field_options.columns') || []

  getConditions: ->
    @get('field_options.conditions') || []

  isConditional: ->
    @getConditions().length > 0

  # Returns true if the new value is different than the old value
  calculateVisibility: ->
    prevValue = !!@isVisible

    @isVisible = (
      # If we're not in a form_renderer context, it's visible
      if !@form_renderer
        true
      else
        if @isConditional()
          _[@conditionMethod()] @getConditions(), (c) =>
            @form_renderer.isConditionalVisible(c)
        else
          true
    )

    prevValue != @isVisible

  conditionMethod: ->
    if @get('field_options.condition_method') == 'any'
      'any'
    else
      'all'

  getSize: ->
    @get('field_options.size') || 'small'

  sizeToHeaderTag: ->
    {
      large: 'h2'
      medium: 'h3'
      small: 'h4'
    }[@getSize()]

FormRenderer.Models.NonInputResponseField = FormRenderer.Models.ResponseField.extend
  input_field: false
  field_type: undefined
  validate: ->
  sync: ->

FormRenderer.Models.ResponseFieldIdentification = FormRenderer.Models.ResponseField.extend
  field_type: 'identification'
  validators: [FormRenderer.Validators.IdentificationValidator]
  isRequired: -> true
  hasValue: ->
    @hasValueHashKey ['email', 'name']

FormRenderer.Models.ResponseFieldMapMarker = FormRenderer.Models.ResponseField.extend
  field_type: 'map_marker'
  hasValue: ->
    _.every ['lat', 'lng'], (key) =>
      !!@get("value.#{key}")
  latLng: ->
    if @hasValue()
      [@get('value.lat'), @get('value.lng')]
  defaultLatLng: ->
    if (lat = @get('field_options.default_lat')) && (lng = @get('field_options.default_lng'))
      [lat, lng]

FormRenderer.Models.ResponseFieldAddress = FormRenderer.Models.ResponseField.extend
  field_type: 'address'
  setExistingValue: (x) ->
    FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    @set('value.country', 'US') unless x?.country

  hasValue: ->
    if @get('field_options.address_format') == 'country'
      !!@get('value.country')
    else
      # Don't accept "country" as a present value, since it's set by default
      @hasValueHashKey ['street', 'city', 'state', 'zipcode']

  toText: ->
    _.values(_.pick(@getValue() || {}, 'street', 'city', 'state', 'zipcode', 'country')).join(' ')

FormRenderer.Models.ResponseFieldCheckboxes = FormRenderer.Models.ResponseField.extend
  field_type: 'checkboxes'
  initialize: ->
    FormRenderer.Models.ResponseField::initialize.apply @, arguments

    # Hide/show the other field
    @on 'change:value.other_checkbox', (_, val) ->
      @set 'showOther', val

  setExistingValue: (x) ->
    @set 'value', _.tap {}, (h) =>
      if !_.isEmpty(x)
        for option, i in @getOptions()
          h["#{i}"] = x[option.label]

        if x.Other?
          h['other_checkbox'] = true
          h['other'] = x.Other
      else
        for option, i in @getOptions()
          h["#{i}"] = FormRenderer.toBoolean(option.checked)

  # transform true to 'on'
  getValue: ->
    returnValue = {}

    for k, v of @get('value')
      returnValue[k] = if v == true
        'on'
      else
        v

    returnValue

  toText: ->
    values = _.tap [], (a) =>
      for k, v of @get('value')
        idx = parseInt(k)

        if v == true && !_.isNaN(idx)
          a.push @getOptions()[idx].label

      if @get('value.other_checkbox') == true
        a.push @get('value.other')

    values.join(' ')

  hasValue: ->
    @hasAnyValueInHash()

FormRenderer.Models.ResponseFieldRadio = FormRenderer.Models.ResponseField.extend
  field_type: 'radio'
  initialize: ->
    FormRenderer.Models.ResponseField::initialize.apply @, arguments

    # Hide/show the other field
    @on 'change:value.selected', (_, val) ->
      @set 'showOther', (val == 'Other')

  setExistingValue: (x) ->
    if x?.selected
      @set 'value', x
    else if (defaultOption = _.find @getOptions(), ( (option) -> FormRenderer.toBoolean(option.checked) ))
      @set 'value.selected', defaultOption.label
    else
      @set 'value', {}

  getValue: ->
    _.tap { merge: true }, (h) =>
      h["#{@get('id')}"] = @get('value.selected')
      h["#{@get('id')}_other"] = @get('value.other')

  toText: ->
    (@getValue() || {})["#{@id}"]

  hasValue: ->
    !!@get('value.selected')

FormRenderer.Models.ResponseFieldDropdown = FormRenderer.Models.ResponseField.extend
  field_type: 'dropdown'
  setExistingValue: (x) ->
    if x?
      FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    else
      checkedOption = _.find @getOptions(), ( (option) -> FormRenderer.toBoolean(option.checked) )

      if !checkedOption && !@get('field_options.include_blank_option')
        checkedOption = _.first @getOptions()

      if checkedOption
        @set 'value', checkedOption.label
      else
        @unset 'value'

FormRenderer.Models.ResponseFieldTable = FormRenderer.Models.ResponseField.extend
  field_type: 'table'
  initialize: ->
    FormRenderer.Models.ResponseField::initialize.apply @, arguments

    if @get('field_options.column_totals')
      @listenTo @, 'change:value.*', @calculateColumnTotals

  canAddRows: ->
    @numRows < @maxRows()

  minRows: ->
    parseInt(@get('field_options.minrows'), 10) || 0

  maxRows: ->
    if @get('field_options.maxrows')
      parseInt(@get('field_options.maxrows'), 10) || Infinity
    else
      Infinity

  setExistingValue: (x) ->
    # Set initial @numRows
    firstColumnLength = _.find(x, (-> true))?.length || 0
    @numRows = Math.max @minRows(), firstColumnLength, 1

    @set 'value', _.tap {}, (h) =>
      # Copy preset value *or* existing value to model
      for i in [0..(@numRows - 1)]
        for column, j in @getColumns()
          h["#{j}"] ||= {}
          h["#{j}"]["#{i}"] = @getPresetValue(column.label, i) || x?[column.label]?[i]

  hasValue: ->
    _.some @get('value'), (colVals, colNumber) =>
      _.some colVals, (v, k) =>
        !@getPresetValueByIndices(colNumber, k) && !!v

  getPresetValue: (columnLabel, row) ->
    @get("field_options.preset_values.#{columnLabel}")?[row]

  getPresetValueByIndices: (col, row) ->
    @get("field_options.preset_values.#{@getColumns()[col].label}")?[row]

  # transform value to { '0' => ['a', 'b'], '1' => ['c', 'd'] } groups
  getValue: ->
    returnValue = {}

    for i in [0..(@numRows - 1)]
      for column, j in @getColumns()
        returnValue[j] ||= []
        returnValue[j].push @get("value.#{j}.#{i}") || ''

    returnValue

  toText: ->
    _.flatten(_.values(@getValue())).join(' ')

  calculateColumnTotals: ->
    for column, j in @getColumns()
      columnVals = []

      for i in [0..(@numRows - 1)]
        columnVals.push parseFloat((@get("value.#{j}.#{i}") || '').replace(/\$?,?/g, ''))

      columnSum = _.reduce columnVals, (memo, num) ->
        if _.isNaN(num) then memo else memo + num
      , 0

      @set "columnTotals.#{j}", @formatColumnSum(columnSum)

  formatColumnSum: (num) ->
    if num > 0
      parsed = parseFloat(num.toFixed(10))
      precision = "#{parsed}".split('.')[1]?.length || 0
      _str.numberFormat(parsed, precision, '.', ',')
    else
      ''

FormRenderer.Models.ResponseFieldFile = FormRenderer.Models.ResponseField.extend
  field_type: 'file'
  addFile: (id, filename) ->
    files = @getFiles().slice(0)
    files.push({ id, filename })
    @set 'value.files', files
  removeFile: (idx) ->
    files = @getFiles().slice(0)
    files.splice(idx, 1)
    @set 'value.files', files
  getFiles: ->
    @get('value.files') || []
  canAddFile: ->
    @getFiles().length < @maxFiles()
  getValue: ->
    _.compact(_.pluck(@getFiles(), 'id'))
  toText: ->
    _.compact(_.pluck(@getFiles(), 'filename')).join(' ')
  hasValue: ->
    _.any @getFiles(), (h) ->
      !!h.id
  getAcceptedExtensions: ->
    if (x = FormRenderer.FILE_TYPES[@get('field_options.file_types')])
      _.map x, (x) -> ".#{x}"
  maxFiles: ->
    if @get('field_options.allow_multiple_files')
      10
    else
      1

FormRenderer.Models.ResponseFieldDate = FormRenderer.Models.ResponseField.extend
  field_type: 'date'
  validators: [FormRenderer.Validators.DateValidator]
  hasValue: ->
    @hasValueHashKey ['month', 'day', 'year']
  toText: ->
    _.values(_.pick(@getValue() || {}, 'month', 'day', 'year')).join('/')

FormRenderer.Models.ResponseFieldEmail = FormRenderer.Models.ResponseField.extend
  validators: [FormRenderer.Validators.EmailValidator]
  field_type: 'email'

FormRenderer.Models.ResponseFieldNumber = FormRenderer.Models.ResponseField.extend
  validators: [
    FormRenderer.Validators.NumberValidator
    FormRenderer.Validators.MinMaxValidator
    FormRenderer.Validators.IntegerValidator
  ]
  field_type: 'number'
  calculateSize: ->
    if (digitsInt = parseInt(@get('field_options.max'), 10))
      digits = "#{digitsInt}".length
    else
      digits = 6

    unless @get('field_options.integer_only')
      digits += 2

    if digits > 6
      'seven_plus'
    else if digits > 3
      'four_six'
    else
      'one_three'

FormRenderer.Models.ResponseFieldParagraph = FormRenderer.Models.ResponseField.extend
  field_type: 'paragraph'
  validators: [FormRenderer.Validators.MinMaxLengthValidator]

FormRenderer.Models.ResponseFieldPrice = FormRenderer.Models.ResponseField.extend
  validators: [
    FormRenderer.Validators.PriceValidator
    FormRenderer.Validators.MinMaxValidator
  ]
  field_type: 'price'
  hasValue: ->
    @hasValueHashKey ['dollars', 'cents']
  toText: ->
    raw = @getValue() || {}
    "#{raw.dollars|| '0'}.#{raw.cents || '00'}"

FormRenderer.Models.ResponseFieldText = FormRenderer.Models.ResponseField.extend
  field_type: 'text'
  validators: [FormRenderer.Validators.MinMaxLengthValidator]

FormRenderer.Models.ResponseFieldTime = FormRenderer.Models.ResponseField.extend
  validators: [FormRenderer.Validators.TimeValidator]
  field_type: 'time'
  hasValue: ->
    @hasValueHashKey ['hours', 'minutes', 'seconds']
  setExistingValue: (x) ->
    FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    @set('value.am_pm', 'AM') unless x?.am_pm
  toText: ->
    raw = @getValue() || {}
    "#{raw.hours || '00'}:#{raw.minutes || '00'}:#{raw.seconds || '00'} #{raw.am_pm}"

FormRenderer.Models.ResponseFieldWebsite = FormRenderer.Models.ResponseField.extend
  field_type: 'website'

FormRenderer.Models.ResponseFieldPhone = FormRenderer.Models.ResponseField.extend
  field_type: 'phone'
  validators: [
    FormRenderer.Validators.PhoneValidator
  ]

for i in FormRenderer.NON_INPUT_FIELD_TYPES
  FormRenderer.Models["ResponseField#{_str.classify(i)}"] = FormRenderer.Models.NonInputResponseField.extend
    field_type: i
