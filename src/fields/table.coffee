FormRenderer.Models.ResponseFieldTable = FormRenderer.Models.ResponseField.extend
  field_type: 'table'
  initialize: ->
    FormRenderer.Models.ResponseField::initialize.apply @, arguments

    if @get('column_totals')
      @listenTo @, 'change:value.*', @calculateColumnTotals

  canAddRows: ->
    @numRows() < @maxRows()

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
    existingNumRows = Math.max @minRows(), (_.values(x)[0]?.length || 0), 1

    @set 'value', _.tap [], (arr) =>
      for column in @getColumns()
        # Copy preset value *or* existing value to model
        colArr = _.map [0..(existingNumRows - 1)], (i) =>
          @getPresetValue(column.label, i) ||
          x?[column.label]?[i]

        arr.push(colArr)

  numRows: ->
    Math.max @minRows(), (@get('value')?[0].length || 0), 1

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

        for i in [0..(@numRows() - 1)]
          h[column.label].push @get("value.#{j}.#{i}") || ''

  toText: ->
    _.flatten(_.values(@getValue())).join(' ')

  calculateColumnTotals: ->
    for column, j in @getColumns()
      columnVals = []

      for i in [0..(@numRows() - 1)]
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

  canRemoveRow: (rowIdx) ->
    min = Math.max(1, @model.minRows())
    rowIdx > (min - 1)

  addRow: (e) ->
    e.preventDefault()
    newVal = {}

    for col, vals of @model.get('value')
      newVal[col] = vals.concat('')

    @model.set('value', newVal)
    @render()

  # Loop through rows, decreasing index for rows above the current row
  removeRow: (e) ->
    e.preventDefault()
    idx = $(e.currentTarget).closest('[data-row-index]').data('row-index')
    newVal = {}

    for col, vals of @model.get('value')
      newVal[col] = _.tap [], (arr) ->
        for i, val of vals
          # if i == idx, this is the row being removed
          arr.push(val) unless parseInt(i, 10) == idx

    @model.set 'value', newVal
    @render()
