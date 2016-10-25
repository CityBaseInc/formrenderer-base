FormRenderer.Views.ResponseField = Backbone.View.extend
  wrapper: 'label'
  field_type: undefined
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
    @$el.addClass "fr_response_field_#{@field_type}"

    if @model.id
      @$el.attr('id', "fr_response_field_#{@model.id}")

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
          if @_isPageButton(newActive)
            $(document).one 'mouseup', => @model.validate()
          else
            @model.validate()
      , 1

  _isPageButton: (el) ->
    el && (el.hasAttribute('data-fr-next-page') || el.hasAttribute('data-fr-previous-page'))

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

  render: ->
    @$el[if @model.getError() then 'addClass' else 'removeClass']('error')
    @$el.html JST['partials/response_field'](@)
    rivets.bind @$el, { model: @model }
    @auditLength()
    @form_renderer?.trigger 'viewRendered', @
    @

FormRenderer.Views.NonInputResponseField = FormRenderer.Views.ResponseField.extend
  render: ->
    @$el.html JST['partials/non_input_response_field'](@)
    @form_renderer?.trigger 'viewRendered', @
    @

FormRenderer.Views.ResponseFieldPrice = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'price'
  events: _.extend {}, FormRenderer.Views.ResponseField::events,
    'blur [data-rv-input="model.value.cents"]': 'formatCents'

  formatCents: (e) ->
    cents = $(e.target).val()
    if cents && cents.match(/^\d$/)
      @model.set('value.cents', "0#{cents}")

FormRenderer.Views.ResponseFieldTable = FormRenderer.Views.ResponseField.extend
  field_type: 'table'
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

FormRenderer.Views.ResponseFieldFile = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'file'
  events: _.extend {}, FormRenderer.Views.ResponseField::events,
    'click [data-fr-remove-file]': 'doRemove'
  render: ->
    FormRenderer.Views.ResponseField::render.apply @, arguments
    @$input = @$el.find('input')
    @$label = @$el.find('.fr_add_file label')
    @$error = @$el.find('.fr_add_file .fr_error')
    uploadingFilename = undefined

    # While label is "disabled", don't open the filepicker
    @$label.on 'click', (e) ->
      e.preventDefault() if $(@).hasClass('disabled')

    if @form_renderer
      @$input.inlineFileUpload
        method: 'post'
        action: "#{@form_renderer.options.screendoorBase}/api/form_renderer/file",
        ajaxOpts:
          headers: @form_renderer.serverHeaders
        additionalParams:
          project_id: @form_renderer.options.project_id
          response_field_id: @model.get('id')
          v: 0
        start: (data) =>
          uploadingFilename = data.filename
          @$label.addClass('disabled')
          @$label.text FormRenderer.t.uploading
          @form_renderer.requests += 1
        progress: (data) =>
          @$label.text(
            if data.percent == 100
              FormRenderer.t.finishing_up
            else
              "#{FormRenderer.t.uploading} (#{data.percent}%)"
          )
        complete: =>
          @form_renderer.requests -= 1
        success: (data) =>
          @model.addFile(data.data.file_id, uploadingFilename)
          @render()
        error: (data) =>
          @render()
          errorText = data.xhr.responseJSON?.errors
          @$error.text(errorText || FormRenderer.t.error).show()
          setTimeout =>
            @$error.hide()
          , 2000

    return @

  doRemove: (e) ->
    idx = @$el.find('[data-fr-remove-file]').index(e.target)
    @model.removeFile(idx)
    @render()

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

FormRenderer.Views.ResponseFieldAddress = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'address'
  initialize: ->
    FormRenderer.Views.ResponseField::initialize.apply @, arguments
    @listenTo @model, 'change:value.country', @render

FormRenderer.Views.ResponseFieldPhone = FormRenderer.Views.ResponseField.extend
  field_type: 'phone'
  phonePlaceholder: ->
    if @model.get('phone_format') == 'us'
      '(xxx) xxx-xxxx'

FormRenderer.Views.ResponseFieldCheckboxes = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'checkboxes'

FormRenderer.Views.ResponseFieldRadio = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'radio'

FormRenderer.Views.ResponseFieldTime = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'time'

FormRenderer.Views.ResponseFieldDate = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'date'

FormRenderer.Views.ResponseFieldConfirm = FormRenderer.Views.ResponseField.extend
  wrapper: 'none'
  field_type: 'confirm'

for i in _.without(FormRenderer.INPUT_FIELD_TYPES, 'address', 'checkboxes', 'radio', 'table', 'file', 'map_marker', 'price', 'phone', 'date', 'time', 'confirm')
  FormRenderer.Views["ResponseField#{_str.classify(i)}"] = FormRenderer.Views.ResponseField.extend
    field_type: i

for i in FormRenderer.NON_INPUT_FIELD_TYPES
  FormRenderer.Views["ResponseField#{_str.classify(i)}"] = FormRenderer.Views.NonInputResponseField.extend
    field_type: i
