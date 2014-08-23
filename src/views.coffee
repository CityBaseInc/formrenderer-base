FormRenderer.Views.Pagination = Backbone.View.extend
  initialize: (options) ->
    @form_renderer = options.form_renderer
    @listenTo @form_renderer.state, 'change:activePage', @render
    @listenTo @form_renderer, 'afterValidate', @render

  render: ->
    @$el.html JST['partials/pagination'](@)
    @

FormRenderer.Views.ErrorAlertBar = Backbone.View.extend
  initialize: (options) ->
    @form_renderer = options.form_renderer
    @listenTo @form_renderer, 'afterValidate', @render

  render: ->
    @$el.html JST['partials/error_alert_bar'](@)
    window.scrollTo(0, 0) unless @form_renderer.areAllPagesValid()
    @

FormRenderer.Views.BottomStatusBar = Backbone.View.extend
  events:
    'click [data-js-back]': 'handleBack'
    'click [data-js-continue]': 'handleContinue'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @listenTo @form_renderer.state, 'change:activePage change:hasChanges change:submitting change:hasServerErrors', @render

  render: ->
    @$el.html JST['partials/bottom_status_bar'](@)
    @

  firstPage: ->
    @form_renderer.state.get('activePage') == 1

  lastPage: ->
    @form_renderer.state.get('activePage') == @form_renderer.numPages

  previousPage: ->
    @form_renderer.state.get('activePage') - 1

  nextPage: ->
    @form_renderer.state.get('activePage') + 1

  handleBack: (e) ->
    e.preventDefault()
    @form_renderer.activatePage @previousPage(), skipValidation: true

  handleContinue: (e) ->
    e.preventDefault()

    if @lastPage() || !@form_renderer.options.enablePages
      @form_renderer.submit()
    else
      @form_renderer.activatePage(@nextPage())

FormRenderer.Views.Page = Backbone.View.extend
  className: 'fr_page'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @models = []
    @views = []

  render: ->
    @hide()

    for rf in @models
      view = new FormRenderer.Views["ResponseField#{_.str.classify(rf.field_type)}"](model: rf, form_renderer: @form_renderer)
      @$el.append view.render().el
      @views.push view

    return @

  hide: ->
    @$el.hide()
    view.trigger('hidden') for view in @views

  show: ->
    @$el.show()
    view.trigger('shown') for view in @views

  validate: ->
    for rf in _.filter(@models, ((rf) -> rf.input_field) )
      rf.validate()

    for view in @views
      view.render()

FormRenderer.Views.ResponseField = Backbone.View.extend
  field_type: undefined
  className: 'fr_response_field'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @model = options.model
    @$el.addClass "fr_response_field_#{@field_type}"

  getDomId: ->
    @model.cid

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

FormRenderer.Views.ResponseFieldTable = FormRenderer.Views.ResponseField.extend
  field_type: 'table'
  events:
    'click [data-js-add-row]': 'addRow'
    'keydown textarea': 'handleKeydown'

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

  addRow: ->
    @model.numRows++
    @render()

  # @todo maybe this is trying to be too fancy?
  handleKeydown: (e) ->
    return unless e.which.toString() in _.keys(@constructor.KEY_DIRECTIONS)

    $ta = $(e.currentTarget)
    col = $ta.data('col')
    row = $ta.data('row')

    switch @constructor.KEY_DIRECTIONS[e.which.toString()]
      when 'up', 'left'
        return unless $ta.caret() == 0

      when 'down', 'right'
        return unless ($ta[0].selectionStart == 0 && $ta[0].selectionEnd > 0) ||
                      ($ta.caret() == $ta.val().length)

    switch @constructor.KEY_DIRECTIONS[e.which.toString()]
      when 'up'
        row -= 1
      when 'down'
        row += 1
      when 'left'
        col -= 1
      when 'right'
        col += 1

    return if (col < 0) || (row < 0)
    e.preventDefault()
    $ta.closest('table').find("tbody tr:eq(#{row}) td:eq(#{col}) textarea").focus()
,
  KEY_DIRECTIONS:
    '37': 'left'
    '38': 'up'
    '39': 'right'
    '40': 'down'

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
    newFilename = if e.target.files?
      e.target.files[0].name
    else if e.target.value
      e.target.value.replace(/^.+\\/, '')

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
    $tmpForm.ajaxSubmit
      url: "#{@form_renderer.options.screendoorBase}/api/form_renderer/file"
      data:
        replace_file_id: @model.get('value.id')
        v: 0
      dataType: 'json'
      uploadProgress: (_, __, ___, percentComplete) =>
        @$status.text(if percentComplete == 100 then 'Finishing up...' else "Uploading... (#{percentComplete}%)")
      complete: =>
        $tmpForm.remove()
      success: (data) =>
        @model.set 'value.id', data.file_id
        @form_renderer.autosaveImmediately()
        @render()
      error: (data) =>
        @$status.text 'Error'
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
    'click .map_marker_field_cover': 'enable'
    'click .map_marker_field_disable': 'disable'

  render: ->
    FormRenderer.Views.ResponseField::render.apply @, arguments
    @$cover = @$el.find('.map_marker_field_cover')
    @loadLeaflet =>
      @initMap()
      if @model.latLng() then @enable()
    @

  loadLeaflet: (cb) ->
    if L?.GeoJSON?
      cb()
    else if !FormRenderer.loadingLeaflet
      FormRenderer.loadingLeaflet = [cb]
      $.getScript FormRenderer.LEAFLET_JS_URL, ->
        x() for x in FormRenderer.loadingLeaflet
    else
      FormRenderer.loadingLeaflet.push(cb)

  initMap: ->
    @map = L.map(@$el.find('.map_marker_field_map')[0])
            .setView(@model.latLng() || @model.defaultLatLng() || FormRenderer.DEFAULT_LAT_LNG, 13)

    @$el.find('.map_marker_field_map').data('map', @map)

    L.tileLayer(FormRenderer.MAP_TILE_URL, maxZoom: 18).addTo(@map)

    @marker = L.marker([0, 0])

    @map.on 'move', =>
      center = @map.getCenter()
      @marker.setLatLng center
      @model.set 'value.lat', center.lat.toFixed(7)
      @model.set 'value.lng', center.lng.toFixed(7)

  enable: ->
    @map.addLayer(@marker)
    @$cover.hide()
    @map.fire('move')

  disable: ->
    @map.removeLayer(@marker)
    @$el.find('.map_marker_field_cover').show()
    @model.set 'value.lat', ''
    @model.set 'value.lng', ''

for i in _.without(FormRenderer.INPUT_FIELD_TYPES, 'table', 'file', 'map_marker')
  FormRenderer.Views["ResponseField#{_.str.classify(i)}"] = FormRenderer.Views.ResponseField.extend
    field_type: i

for i in FormRenderer.NON_INPUT_FIELD_TYPES
  FormRenderer.Views["ResponseField#{_.str.classify(i)}"] = FormRenderer.Views.NonInputResponseField.extend
    field_type: i
