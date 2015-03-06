FormRenderer.Views.ResponseField = Backbone.View.extend
  field_type: undefined
  className: 'fr_response_field'

  initialize: (options) ->
    @form_renderer = options.form_renderer

    if @form_renderer
      @showLabels = @form_renderer.options.showLabels
    else
      @showLabels = options.showLabels

    @model = options.model
    @$el.addClass "fr_response_field_#{@field_type}"

  getDomId: ->
    @model.cid

  reflectConditions: ->
    if @model.isVisible
      @$el.show()
    else
      @$el.hide()

  render: ->
    @$el[if @model.getError() then 'addClass' else 'removeClass']('error')
    @$el.html JST['partials/response_field'](@)
    rivets.bind @$el, { model: @model }
    @

FormRenderer.Views.NonInputResponseField = FormRenderer.Views.ResponseField.extend
  render: ->
    @$el.addClass "fr_response_field_#{@field_type}"
    @$el.html JST['partials/non_input_response_field'](@)
    @

FormRenderer.Views.ResponseFieldPrice = FormRenderer.Views.ResponseField.extend
  field_type: 'price'
  events:
    'blur [data-rv-input="model.value.cents"]': 'formatCents'

  formatCents: (e) ->
    cents = $(e.target).val()
    if cents && cents.match(/^\d$/)
      @model.set('value.cents', "0#{cents}")

FormRenderer.Views.ResponseFieldTable = FormRenderer.Views.ResponseField.extend
  field_type: 'table'
  events:
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

  canRemoveRows: ->
    @model.numRows > Math.max(1, @model.minRows())

  addRow: ->
    @model.numRows++
    @render()

  # Loop through rows, decreasing index for rows above the current row
  removeRow: (e) ->
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
    @model.trigger('change change:value')
    @render()

FormRenderer.Views.ResponseFieldFile = FormRenderer.Views.ResponseField.extend
  field_type: 'file'
  events:
    'click [data-js-remove]': 'doRemove'
  render: ->
    FormRenderer.Views.ResponseField::render.apply @, arguments
    @$el[if @model.hasValue() then 'addClass' else 'removeClass']('existing')
    @$input = @$el.find('input')
    @$status = @$el.find('.upload_status')
    @bindChangeEvent()
    return @

  bindChangeEvent: ->
    @$input.on 'change', $.proxy(@fileChanged, @)

  fileChanged: (e) ->
    newFilename = if e.target.files?[0]?
      e.target.files[0].name
    else if e.target.value
      e.target.value.replace(/^.+\\/, '')
    else
      'Error reading filename'

    @model.set 'value.filename', newFilename, silent: true
    @$el.find('.filename').text newFilename
    @$status.text 'Uploading...'
    @doUpload()

  doUpload: ->
    $tmpForm = $("<form method='post' style='display: inline;' />")
    $oldInput = @$input
    @$input = $oldInput.clone().hide().val('').insertBefore($oldInput)
    @bindChangeEvent()
    $oldInput.appendTo($tmpForm)
    $tmpForm.insertBefore(@$input)
    @form_renderer.uploads += 1
    $tmpForm.ajaxSubmit
      url: "#{@form_renderer.options.screendoorBase}/api/form_renderer/file"
      data:
        response_field_id: @model.get('id')
        replace_file_id: @model.get('value.id')
        v: 0
      dataType: 'json'
      uploadProgress: (_, __, ___, percentComplete) =>
        @$status.text(if percentComplete == 100 then 'Finishing up...' else "Uploading... (#{percentComplete}%)")
      complete: =>
        @form_renderer.uploads -= 1
        $tmpForm.remove()
      success: (data) =>
        @model.set 'value.id', data.file_id
        @form_renderer.autosaveImmediately()
        @render()
      error: (data) =>
        errorText = data.responseJSON?.errors
        @$status.text(if errorText then "Error: #{errorText}" else 'Error')
        @$status.addClass('is_error')
        setTimeout =>
          @render()
        , 2000

  doRemove: ->
    @model.set 'value', {}
    @form_renderer.autosaveImmediately()
    @render()

FormRenderer.Views.ResponseFieldMapMarker = FormRenderer.Views.ResponseField.extend
  field_type: 'map_marker'
  events:
    'click .fr_map_cover': 'enable'
    'click [data-js-clear]': 'disable'

  initialize: ->
    FormRenderer.Views.ResponseField::initialize.apply @, arguments

    @on 'shown', ->
      @refreshing = true
      @map?._onResize()
      setTimeout =>
        @refreshing = false
      , 0

  render: ->
    FormRenderer.Views.ResponseField::render.apply @, arguments
    @$cover = @$el.find('.fr_map_cover')
    FormRenderer.loadLeaflet =>
      @initMap()
      if @model.latLng() then @enable()
    @

  initMap: ->
    @map = FormRenderer.initMap(@$el.find('.fr_map_map')[0])
    @$el.find('.fr_map_map').data('map', @map)
    @map.setView(@model.latLng() || @model.defaultLatLng() || FormRenderer.DEFAULT_LAT_LNG, 13)
    @marker = L.marker([0, 0])
    @map.on 'move', $.proxy(@_onMove, @)

  _onMove: ->
    # We're just refreshing the leaflet map, not actually saving anything
    return if @refreshing
    center = @map.getCenter()
    @marker.setLatLng center
    @model.set
      value:
        lat: center.lat.toFixed(7)
        lng: center.lng.toFixed(7)

  enable: ->
    @map.addLayer(@marker)
    @$cover.hide()
    @_onMove()

  disable: ->
    @map.removeLayer(@marker)
    @$el.find('.fr_map_cover').show()
    @model.set value: { lat: '', lng: '' }

FormRenderer.Views.ResponseFieldAddress = FormRenderer.Views.ResponseField.extend
  field_type: 'address'
  initialize: ->
    FormRenderer.Views.ResponseField::initialize.apply @, arguments
    @listenTo @model, 'change:value.country', @render

for i in _.without(FormRenderer.INPUT_FIELD_TYPES, 'address', 'table', 'file', 'map_marker', 'price')
  FormRenderer.Views["ResponseField#{_.str.classify(i)}"] = FormRenderer.Views.ResponseField.extend
    field_type: i

for i in FormRenderer.NON_INPUT_FIELD_TYPES
  FormRenderer.Views["ResponseField#{_.str.classify(i)}"] = FormRenderer.Views.NonInputResponseField.extend
    field_type: i
