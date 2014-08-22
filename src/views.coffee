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
    'click .go_back_button': 'handleBack'
    'click .continue_button': 'handleContinue'

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
  className: 'form_renderer_page'

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
  className: 'form_renderer_response_field'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @model = options.model
    @$el.addClass "response_field_#{@field_type}"

  getDomId: ->
    @model.cid

  render: ->
    @$el[if @model.getError() then 'addClass' else 'removeClass']('error')
    @$el.html JST['partials/response_field'](@)
    rivets.bind @$el, { model: @model }
    @

FormRenderer.Views.NonInputResponseField = FormRenderer.Views.ResponseField.extend
  render: ->
    @$el.addClass "response_field_#{@field_type}"
    @$el.html JST['partials/non_input_response_field'](@)
    @

FormRenderer.Views.ResponseFieldTable = FormRenderer.Views.ResponseField.extend
  field_type: 'table'
  events:
    'click .add_another_row': 'addRow'
    'keydown textarea': 'handleKeydown'

  initialize: ->
    FormRenderer.Views::ResponseField.initialize.apply @, arguments

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
  render: ->
    FormRenderer.Views.ResponseField::render.apply @, arguments

    # if @form_renderer
      # @$el.find('.pretty_file_input').prettyFileInput
      #   action: @form_renderer.options.url
      #   method: 'post'
      #   name: "raw_responses[#{@model.get('id')}][]"
      #   additional_parameters: @form_renderer.saveParams()
      #   beforeRemove: =>
      #     @model.set 'value', {}, silent: true
      #   beforeUpload: (filename, pfi) =>
      #     pfi.options.additional_parameters = @form_renderer.saveParams()
      #     @model.set 'value.filename', filename, silent: true
      #   onUploadError: =>
      #     @model.set 'value.filename', '', silent: true
      #   onUploadSuccess: (data) =>
      #     @form_renderer.options.response.id = data.response_id
      #     @form_renderer.trigger 'afterSave'

    return @

FormRenderer.Views.ResponseFieldMapMarker = FormRenderer.Views.ResponseField.extend
  field_type: 'map_marker'
  events:
    'click .map_marker_field_cover': 'enable'
    'click .map_marker_field_disable': 'disable'

  render: ->
    FormRenderer.Views.ResponseField::render.apply @, arguments
    @$cover = @$el.find('.map_marker_field_cover')
    requireOnce App.MAP_JS_URL, =>
      @initMap()
      if @model.latLng() then @enable()
    @

  initMap: ->
    @map = L.map(@$el.find('.map_marker_field_map')[0])
            .setView(@model.latLng() || @model.defaultLatLng() || App.DEFAULT_LAT_LNG, 13)

    @$el.find('.map_marker_field_map').data('map', @map)

    L.tileLayer(App.MAP_TILE_URL, maxZoom: 18).addTo(@map)

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
