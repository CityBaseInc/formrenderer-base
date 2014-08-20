class FormRenderer.Models.ResponseField extends Backbone.DeepModel
  input_field: true
  field_type: undefined
  validators: []
  sync: ->
  initialize: ->
    @errors = []

    if @hasLengthValidations()
      @listenTo @, 'change:value', @calculateLength

  validate: ->
    @errors = []

    # Presence is a special-case, since it will stop us from running any other validators
    if !@hasValue()
      @errors.push("can't be blank") if @get('required')
      return

    # If value is present, run all the other validators
    for validatorName, validator of @validators
      v = new validator(@)
      newError = v.validate()
      @errors.push(newError) if newError

  getError: ->
    @errors.join('. ') if @errors.length > 0

  hasLengthValidations: ->
    @get('field_options.minlength') || @get('field_options.maxlength')

  calculateLength: ->
    v = new FormRenderer.Validators.MinMaxLengthValidator(@)
    @set 'currentLength', v[if @getLengthValidationUnits() == 'words' then 'countWords' else 'countCharacters']()

  hasMinMaxValidations: ->
    @get('field_options.min') || @get('field_options.max')

  getLengthValidationUnits: ->
    @get('field_options.min_max_length_units') || 'characters'

  setExistingValue: (x) ->
    @set('value', x) if x
    @calculateLength() if @hasLengthValidations()

  getValue: ->
    @get('value')

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

  columnOrOptionKeypath: ->
    if @field_type == 'table' then 'field_options.columns' else 'field_options.options'

  addOptionOrColumnAtIndex: (i) ->
    opts = if @field_type == 'table' then @getColumns() else @getOptions()
    newOpt = { label: '' }
    newOpt['checked'] = false unless @field_type == 'table'

    if i == -1
      opts.push newOpt
    else
      opts.splice(i + 1, 0, newOpt)

    @set @columnOrOptionKeypath(), opts
    @trigger 'change'

  removeOptionOrColumnAtIndex: (i) ->
    opts = @get(@columnOrOptionKeypath())
    opts.splice i, 1
    @set @columnOrOptionKeypath(), opts
    @trigger 'change'

class FormRenderer.Models.NonInputResponseField extends Backbone.DeepModel
  input_field: false
  field_type: undefined
  sync: ->

class FormRenderer.Models.ResponseFieldMapMarker extends FormRenderer.Models.ResponseField
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

class FormRenderer.Models.ResponseFieldAddress extends FormRenderer.Models.ResponseField
  field_type: 'address'
  setExistingValue: (x) ->
    super
    @set('value.country', 'US') unless x?.country
  hasValue: ->
    @hasValueHashKey ['street', 'city', 'state', 'zipcode']

class FormRenderer.Models.ResponseFieldCheckboxes extends FormRenderer.Models.ResponseField
  field_type: 'checkboxes'
  setExistingValue: (x) ->
    @set 'value', _.tap {}, (h) =>
      if !_.isEmpty(x)
        for option, i in @getOptions()
          h["#{i}"] = x[option.label]

        if x.Other
          h['other_checkbox'] = true
          h['other'] = x.Other
      else
        for option, i in @getOptions()
          h["#{i}"] = _.toBoolean(option.checked)

  # transform true to 'on'
  getValue: ->
    returnValue = {}

    for k, v of @get('value')
      returnValue[k] = if v == true
        'on'
      else
        v

    returnValue

  hasValue: ->
    @hasAnyValueInHash()

class FormRenderer.Models.ResponseFieldRadio extends FormRenderer.Models.ResponseField
  field_type: 'radio'
  setExistingValue: (x) ->
    if x?.selected
      @set 'value', x
    else if (defaultOption = _.find @getOptions(), ( (option) -> _.toBoolean(option.checked) ))
      @set 'value.selected', defaultOption.label
    else
      @set 'value', {}

  getValue: ->
    _.tap { merge: true }, (h) =>
      h["#{@get('id')}"] = @get('value.selected')
      h["#{@get('id')}_other"] = @get('value.other')

  hasValue: ->
    !!@get('value.selected')

class FormRenderer.Models.ResponseFieldDropdown extends FormRenderer.Models.ResponseField
  field_type: 'dropdown'
  setExistingValue: (x) ->
    if x?
      super
    else
      checkedOption = _.find @getOptions(), ( (option) -> _.toBoolean(option.checked) )

      if !checkedOption && !@get('field_options.include_blank_option')
        checkedOption = _.first @getOptions()

      if checkedOption
        @set 'value', checkedOption.label
      else
        @unset 'value'

class FormRenderer.Models.ResponseFieldTable extends FormRenderer.Models.ResponseField
  field_type: 'table'
  initialize: ->
    super

    if @get('field_options.column_totals')
      @listenTo @, 'change:value.*', @calculateColumnTotals

  setExistingValue: (x) ->
    # Set initial @numRows
    firstColumnLength = _.find(x, (-> true))?.length || 0
    minRows = parseInt(@get('field_options.minrows'), 10) || 0
    @numRows = Math.max minRows, firstColumnLength, 1

    @set 'value', _.tap {}, (h) =>
      # Copy preset value *or* existing value to model
      for i in [0..(@numRows - 1)]
        for column, j in @getColumns()
          h["#{j}"] ||= {}
          h["#{j}"]["#{i}"] = @getPresetValue(column.label, i) || x?[column.label]?[i]

  hasValue: ->
    _.some @get('value'), (colVals, colNumber) ->
      _.some colVals, (v, k) ->
        !!v

  getPresetValue: (columnLabel, rowIndex) ->
    @get("field_options.preset_values.#{columnLabel}")?[rowIndex]

  # transform value to { '0' => ['a', 'b'], '1' => ['c', 'd'] } groups
  getValue: ->
    returnValue = {}

    for i in [0..(@numRows - 1)]
      for column, j in @getColumns()
        returnValue[j] ||= []
        returnValue[j].push @get("value.#{j}.#{i}") || ''

    returnValue

  calculateColumnTotals: ->
    for column, j in @getColumns()
      columnVals = []

      for i in [0..(@numRows - 1)]
        columnVals.push parseFloat((@get("value.#{j}.#{i}") || '').replace(/\$?,?/g, ''))

      columnSum = _.reduce columnVals, (memo, num) ->
        if _.isNaN(num) then memo else memo + num
      , 0

      @set "columnTotals.#{j}", if columnSum > 0 then parseFloat(columnSum.toFixed(10)) else ''

class FormRenderer.Models.ResponseFieldFile extends FormRenderer.Models.ResponseField
  field_type: 'file'
  # Remove value, we're setting this immediately, not on total form save
  getValue: ->
    ''
  hasValue: ->
    @hasValueHashKey ['id', 'filename']

class FormRenderer.Models.ResponseFieldDate extends FormRenderer.Models.ResponseField
  field_type: 'date'
  validators: [FormRenderer.Validators.DateValidator]
  hasValue: ->
    @hasValueHashKey ['month', 'day', 'year']

class FormRenderer.Models.ResponseFieldEmail extends FormRenderer.Models.ResponseField
  validators: [FormRenderer.Validators.EmailValidator]
  field_type: 'email'

class FormRenderer.Models.ResponseFieldNumber extends FormRenderer.Models.ResponseField
  validators: [
    FormRenderer.Validators.NumberValidator
    FormRenderer.Validators.MinMaxValidator
    FormRenderer.Validators.IntegerValidator
  ]
  field_type: 'number'

class FormRenderer.Models.ResponseFieldParagraph extends FormRenderer.Models.ResponseField
  field_type: 'paragraph'
  validators: [FormRenderer.Validators.MinMaxLengthValidator]

class FormRenderer.Models.ResponseFieldPrice extends FormRenderer.Models.ResponseField
  validators: [
    FormRenderer.Validators.PriceValidator
    FormRenderer.Validators.MinMaxValidator
  ]
  field_type: 'price'
  hasValue: ->
    @hasValueHashKey ['dollars', 'cents']

class FormRenderer.Models.ResponseFieldText extends FormRenderer.Models.ResponseField
  field_type: 'text'
  validators: [FormRenderer.Validators.MinMaxLengthValidator]

class FormRenderer.Models.ResponseFieldTime extends FormRenderer.Models.ResponseField
  validators: [FormRenderer.Validators.TimeValidator]
  field_type: 'time'
  hasValue: ->
    @hasValueHashKey ['hours', 'minutes', 'seconds']
  setExistingValue: (x) ->
    super
    @set('value.am_pm', 'AM') unless x?.am_pm

class FormRenderer.Models.ResponseFieldWebsite extends FormRenderer.Models.ResponseField
  field_type: 'website'

for i in FormRenderer.NON_INPUT_FIELD_TYPES
  class FormRenderer.Models["ResponseField#{_.str.classify(i)}"] extends FormRenderer.Models.NonInputResponseField
    field_type: i
