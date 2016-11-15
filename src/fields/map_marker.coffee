FormRenderer.loadLeaflet = (cb) ->
  if L?.GeoJSON?
    cb()
  else
    requireOnce FormRenderer.MAPBOX_URL, cb

FormRenderer.initMap = (el) ->
  L.mapbox.accessToken = 'pk.eyJ1IjoiYWRhbWphY29iYmVja2VyIiwiYSI6Im1SVEQtSm8ifQ.ZgEOSXsv9eLfGQ-9yAmtIg'
  L.mapbox.map(el, 'adamjacobbecker.ja7plkah')

FormRenderer.Models.ResponseFieldMapMarker = FormRenderer.Models.ResponseField.extend
  field_type: 'map_marker'
  latLng: ->
    @get('value')
  defaultLatLng: ->
    if (lat = @get('default_lat')) && (lng = @get('default_lng'))
      [lat, lng]

FormRenderer.Views.ResponseFieldMapMarker = FormRenderer.Views.ResponseField.extend
  field_type: 'map_marker'
  events: _.extend {}, FormRenderer.Views.ResponseField::events,
    'click .fr_map_cover': 'enable'
    'click [data-fr-clear-map]': 'disable'

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
      value: [center.lat.toFixed(7), center.lng.toFixed(7)]

    # Rivets doesn't bind to arrays properly
    @model.trigger('change:value.0 change:value.1')

  enable: ->
    return unless @map
    @map.addLayer(@marker)
    @$cover.hide()
    @_onMove()

  disable: (e) ->
    e.preventDefault()
    @map.removeLayer(@marker)
    @$el.find('.fr_map_cover').show()
    @model.unset('value')
