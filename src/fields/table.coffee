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

FormRenderer.Views.ResponseFieldTable = FormRenderer.Views.ResponseField.extend
  events: _.extend {}, FormRenderer.Views.ResponseField::events,
    'click .js-add-row': 'addRow'
    'click .js-remove-row': 'removeRow'

  initialize: ->
    FormRenderer.Views.ResponseField::initialize.apply @, arguments

    @on 'shown', ->
      @initExpanding()

  render: ->
    FormRenderer.Views.ResponseField::render.apply @, arguments
    @initExpanding()
    @

  initExpanding: ->
    # Temporarily remove -- this is a major performance hit.
    # @$el.find('textarea').expanding()

  canRemoveRow: (rowIdx) ->
    min = Math.max(1, @model.minRows())
    rowIdx > (min - 1)

  addRow: (e) ->
    e.preventDefault()
    @model.numRows++
    @render()

  # Loop through rows, decreasing index for rows above the current row
  removeRow: (e) ->
    e.preventDefault()
    idx = $(e.currentTarget).closest('[data-row-index]').data('row-index')
    modelVal = @model.get('value')
    newVal = {}

    for col, vals of modelVal
      newVal[col] = _.tap {}, (h) ->
        for i, val of vals
          i = parseInt(i, 10)

          if i < idx
            h[i] = val
          else if i > idx
            h[i - 1] = val

          # if i == idx, this is the row being removed

    @model.numRows--
    @model.attributes.value = newVal # setting this directly.. ugh
    @model.trigger('change change:value', @model)
    @render()
