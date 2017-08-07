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

  getConditions: ->
    @get('conditions') || []

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
    if @get('condition_method') == 'any'
      'any'
    else
      'all'

  getSize: ->
    @get('size') || 'small'

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
  latLng: ->
    @get('value')
  defaultLatLng: ->
    if (lat = @get('default_lat')) && (lng = @get('default_lng'))
      [lat, lng]

FormRenderer.Models.ResponseFieldAddress = FormRenderer.Models.ResponseField.extend
  field_type: 'address'
  setExistingValue: (x) ->
    FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    @set('value.country', 'US') unless x?.country

  hasValue: ->
    if @get('address_format') == 'country'
      !!@get('value.country')
    else
      # Don't accept "country" as a present value, since it's set by default
      @hasValueHashKey ['street', 'city', 'state', 'zipcode']

  toText: ->
    _.values(_.pick(@getValue() || {}, 'street', 'city', 'state', 'zipcode', 'country')).join(' ')

FormRenderer.Models.ResponseFieldCheckboxes = FormRenderer.Models.ResponseField.extend
  field_type: 'checkboxes'

  setExistingValue: (x) ->
    if !x?
      h = { checked: [] }

      # Set default values
      for option in @getOptions()
        if FormRenderer.toBoolean(option.checked)
          h.checked.push(option.label)

      @set('value', h)
    else
      FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments

  toText: ->
    arr = @get('value.checked')?.slice(0) || []

    if @get('value.other_checked') == true
      arr.push @get('value.other_text')

    arr.join(' ')

  hasValue: ->
    @get('value.checked')?.length > 0 ||
    @get('value.other_checked')

FormRenderer.Models.ResponseFieldRadio = FormRenderer.Models.ResponseFieldCheckboxes.extend
  field_type: 'radio'

  deselectAllOtherOptions: (ev) ->
    radio_grouping = $(ev.target).closest('.fr_field_wrapper')
    radio_grouping.find('input[type=radio]:checked').not(ev.target).prop('checked', false).trigger 'change'

FormRenderer.Models.ResponseFieldDropdown = FormRenderer.Models.ResponseField.extend
  field_type: 'dropdown'
  setExistingValue: (x) ->
    if x?
      FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    else
      checkedOption = _.find @getOptions(), ( (option) -> FormRenderer.toBoolean(option.checked) )

      if !checkedOption && !@get('include_blank_option')
        checkedOption = _.first @getOptions()

      if checkedOption
        @set 'value', checkedOption.label
      else
        @unset 'value'

FormRenderer.Models.ResponseFieldTable = FormRenderer.Models.ResponseField.extend
  field_type: 'table'
  initialize: ->
    FormRenderer.Models.ResponseField::initialize.apply @, arguments

    if @get('column_totals')
      @listenTo @, 'change:value.*', @calculateColumnTotals

  canAddRows: ->
    @numRows < @maxRows()

  minRows: ->
    parseInt(@get('minrows'), 10) || 0

  maxRows: ->
    if @get('maxrows')
      parseInt(@get('maxrows'), 10) || Infinity
    else
      Infinity

  # The server sends us data like this:
  #   { 'column' => ['a', 'b'], 'column two' => ['c', 'd'] }
  #
  # Transform it to this:
  #   [['a', 'b'], ['c', 'd']]
  setExistingValue: (x) ->
    # Set initial @numRows
    firstColumnLength = _.find(x, (-> true))?.length || 0
    @numRows = Math.max @minRows(), firstColumnLength, 1

    @set 'value', _.tap [], (arr) =>
      for column in @getColumns()
        colArr = []

        # Copy preset value *or* existing value to model
        for i in [0..(@numRows - 1)]
          colArr.push(
            @getPresetValue(column.label, i) ||
            x?[column.label]?[i]
          )

        arr.push(colArr)

  # Ignore preset values when calculating hasValue
  hasValue: ->
    _.some @getValue(), (colVals, colLabel) =>
      _.some colVals, (v, idx) =>
        !@getPresetValue(colLabel, idx) && !!v

  getPresetValue: (columnLabel, row) ->
    @get('preset_values')?[columnLabel]?[row]

  # We have data like this:
  #   [['a', 'b'], ['c', 'd']]
  #
  # The server wants data like this:
  #   { 'column' => ['a', 'b'], 'column two' => ['c', 'd'] }
  getValue: ->
    _.tap {}, (h) =>
      for column, j in @getColumns()
        h[column.label] = []

        for i in [0..(@numRows - 1)]
          h[column.label].push @get("value.#{j}.#{i}") || ''

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
    files.push(id: id, filename: filename)
    @set 'value', files
  removeFile: (idx) ->
    files = @getFiles().slice(0)
    files.splice(idx, 1)
    @set 'value', files
  getFiles: ->
    @get('value') || []
  canAddFile: ->
    @getFiles().length < @maxFiles()
  toText: ->
    _.compact(_.pluck(@getFiles(), 'filename')).join(' ')
  hasValue: ->
    _.any @getFiles(), (h) ->
      !!h.id
  getAcceptedExtensions: ->
    if (x = FormRenderer.FILE_TYPES[@get('file_types')])
      _.map x, (x) -> ".#{x}"
  getValue: ->
    @getFiles()
  maxFiles: ->
    if @get('allow_multiple_files')
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
    if (digitsInt = parseInt(@get('max'), 10))
      digits = "#{digitsInt}".length
    else
      digits = 6

    unless @get('integer_only')
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

FormRenderer.Models.ResponseFieldConfirm = FormRenderer.Models.ResponseField.extend
  field_type: 'confirm'
  getValue: ->
    @get('value') || false # Send `false` instead of null
  setExistingValue: (x) ->
    @set('value', !!x)
  toText: ->
    # These act as constants
    if @get('value')
      'Yes'
    else
      'No'

for i in FormRenderer.NON_INPUT_FIELD_TYPES
  FormRenderer.Models["ResponseField#{_str.classify(i)}"] = FormRenderer.Models.NonInputResponseField.extend
    field_type: i
