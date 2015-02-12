window.FormRenderer = FormRenderer = Backbone.View.extend
  defaults:
    enableAutosave: true
    enableBeforeUnload: true
    enablePages: true
    enableErrorAlertBar: true
    enableBottomStatusBar: true
    enableLocalstorage: true
    screendoorBase: 'https://screendoor.dobt.co'
    target: '[data-formrenderer]'
    validateImmediately: false
    response: {}
    preview: false
    skipValidation: undefined
    saveParams: {}
    showLabels: false
    # afterSubmit:
    # response_fields:
    # response:
    #   id:
    #   responses:
    # project_id:

  events:
    'click [data-activate-page]': (e) ->
      @activatePage $(e.currentTarget).data('activate-page'), skipValidation: true

  draftIdStorageKey: ->
    "project-#{@options.project_id}-response-id"

  constructor: (options) ->
    @options = $.extend {}, @defaults, options
    @uploads = 0
    @state = new Backbone.Model
      hasChanges: false
    @setElement $(@options.target)
    @$el.addClass 'fr_form'
    @$el.data 'form-renderer', @
    @subviews = { pages: {} }

    # Loading state
    @$el.html JST['main'](@)

    @initLocalstorage() if @options.enableLocalstorage && store.enabled

    @loadFromServer =>
      @$el.find('.fr_loading').remove()
      @constructResponseFields()
      @constructPages()
      if @options.enablePages then @constructPagination() else @disablePagination()
      @constructBottomStatusBar() if @options.enableBottomStatusBar
      @constructErrorAlertBar() if @options.enableErrorAlertBar
      @initAutosave() if @options.enableAutosave
      @initBeforeUnload() if @options.enableBeforeUnload
      @validateAllPages() if @options.validateImmediately

  initLocalstorage: ->
    @options.response.id ||= store.get(@draftIdStorageKey())

    @listenTo @, 'afterSave', ->
      unless @state.get('submitting')
        store.set @draftIdStorageKey(), @options.response.id

  loadFromServer: (cb) ->
    return cb() if @options.response_fields? && @options.response.responses?

    $.ajax
      url: "#{@options.screendoorBase}/api/form_renderer/load"
      type: 'get'
      dataType: 'json'
      data:
        project_id: @options.project_id
        response_id: @options.response.id
        v: 0
      success: (data) =>
        @options.response.id = data.response_id
        @options.response_fields ||= data.project.response_fields
        @options.response.responses ||= (data.response?.responses || {})
        cb()
      error: =>
        store.remove @draftIdStorageKey()

  constructResponseFields: ->
    @response_fields = new Backbone.Collection

    for rf in @options.response_fields
      model = new FormRenderer.Models["ResponseField#{_.str.classify(rf.field_type)}"](rf)
      model.setExistingValue(@options.response.responses[model.get('id')]) if model.input_field
      @response_fields.add model

    @listenTo @response_fields, 'change', ->
      @state.set('hasChanges', true) unless @state.get('hasChanges')

  validateCurrentPage: ->
    @trigger "beforeValidate beforeValidate:#{@state.get('activePage')}"
    @subviews.pages[@state.get('activePage')].validate()
    @trigger "afterValidate afterValidate:#{@state.get('activePage')}"
    return @isPageValid(@state.get('activePage'))

  validateAllPages: ->
    @trigger 'beforeValidate beforeValidate:all'

    for pageNumber, page of @subviews.pages
      page.validate()

    @trigger 'afterValidate afterValidate:all'

    return @areAllPagesValid()

  isPageValid: (pageNumber) ->
    !_.find(@subviews.pages[pageNumber].models, ((rf) -> rf.input_field && rf.errors.length > 0))

  areAllPagesValid: ->
    _.every [1..@numPages], (x) =>
      @isPageValid(x)

  numValidationErrors: ->
    @response_fields.filter((rf) -> rf.input_field && rf.errors.length > 0).length

  constructPages: ->
    addPage = =>
      @subviews.pages[currentPageInLoop] = new FormRenderer.Views.Page(form_renderer: @)

    @numPages = @response_fields.filter((rf) -> rf.get('field_type') == 'page_break').length + 1
    @state.set 'activePage', 1
    currentPageInLoop = 1
    addPage()

    @response_fields.each (rf) =>
      if rf.get('field_type') == 'page_break'
        currentPageInLoop++
        addPage()
      else
        @subviews.pages[currentPageInLoop].models.push rf

    for pageNumber, page of @subviews.pages
      @$el.append page.render().el

  constructPagination: ->
    @subviews.pagination = new FormRenderer.Views.Pagination(form_renderer: @)
    @$el.prepend @subviews.pagination.render().el
    @subviews.pages[@state.get('activePage')].show()

  disablePagination: ->
    for pageNumber, page of @subviews.pages
      page.show()

  constructBottomStatusBar: ->
    @subviews.bottomStatusBar = new FormRenderer.Views.BottomStatusBar(form_renderer: @)
    @$el.append @subviews.bottomStatusBar.render().el

  constructErrorAlertBar: ->
    @subviews.errorAlertBar = new FormRenderer.Views.ErrorAlertBar(form_renderer: @)
    @$el.prepend @subviews.errorAlertBar.render().el

  activatePage: (newPageNumber, opts = {}) ->
    return unless opts.skipValidation || @validateCurrentPage()
    @subviews.pages[@state.get('activePage')].hide()
    @subviews.pages[newPageNumber].show()
    @state.set 'activePage', newPageNumber

  getValue: ->
    _.tap {}, (h) =>
      @response_fields.each (rf) ->
        return unless rf.input_field
        gotValue = rf.getValue()

        if (typeof gotValue == 'object') && gotValue.merge
          delete gotValue.merge
          _.extend(h, gotValue)
        else
          h[rf.get('id')] = gotValue

  saveParams: ->
    _.extend
      v: 0
      response_id: @options.response.id
      project_id: @options.project_id
      skip_validation: @options.skipValidation
    ,
      @options.saveParams

  save: (options = {}) ->
    @isSaving = true

    $.ajax
      url: "#{@options.screendoorBase}/api/form_renderer/save"
      type: 'post'
      dataType: 'json'
      data: _.extend @saveParams(), {
        raw_responses: @getValue(),
        submit: if options.submit then true else undefined
      }
      complete: =>
        @isSaving = false
        options.complete?.apply(@, arguments)
        @trigger 'afterSave'
      success: (data) =>
        @state.set
          hasChanges: false
          hasServerErrors: false
        @options.response.id = data.response_id
        options.success?.apply(@, arguments)
      error: =>
        @state.set
          hasServerErrors: true
          submitting: false
        options.error?.apply(@, arguments)

  initAutosave: ->
    setInterval =>
      @save() if @state.get('hasChanges') && !@isSaving
    , 5000

  autosaveImmediately: ->
    if @state.get('hasChanges') && !@isSaving && @options.enableAutosave
      @save()

  initBeforeUnload: ->
    BeforeUnload.enable
      if: => @state.get('hasChanges')

  waitForUploads: (cb) ->
    if @uploads > 0
      setTimeout ( => @waitForUploads(cb) ), 100
    else
      cb()

  submit: (opts = {}) ->
    return unless opts.skipValidation || @options.skipValidation || @validateAllPages()
    @state.set('submitting', true)
    return @preview() if @options.preview
    afterSubmit = opts.afterSubmit || @options.afterSubmit

    @waitForUploads =>
      @save submit: true, success: =>
        store.remove @draftIdStorageKey()

        if typeof afterSubmit == 'function'
          afterSubmit.call @
        else if typeof afterSubmit == 'string'
          window.location = afterSubmit.replace(':id', @options.response.id)
        else if typeof afterSubmit == 'object' && afterSubmit.method == 'page'
          $page = $("<div class='fr_after_submit_page'>#{afterSubmit.html}</div>")
          @$el.replaceWith($page)
        else
          console.log '[FormRenderer] Not sure what to do...'

  preview: ->
    cb = =>
      window.location = @options.preview.replace(':id', @options.response.id)

    if @state.get('hasChanges') || !@options.enableAutosave || !@options.response.id
      @save success: cb
    else
      cb()

FormRenderer.INPUT_FIELD_TYPES = [
  'identification'
  'address'
  'checkboxes'
  'date'
  'dropdown'
  'email'
  'file'
  'number'
  'paragraph'
  'price'
  'radio'
  'table'
  'text'
  'time'
  'website'
  'map_marker'
]

FormRenderer.NON_INPUT_FIELD_TYPES = [
  'block_of_text'
  'page_break'
  'section_break'
]

FormRenderer.FIELD_TYPES = _.union FormRenderer.INPUT_FIELD_TYPES, FormRenderer.NON_INPUT_FIELD_TYPES

FormRenderer.Views = {}
FormRenderer.Models = {}
FormRenderer.Validators = {}

FormRenderer.BUTTON_CLASS = ''
FormRenderer.DEFAULT_LAT_LNG = [40.7700118, -73.9800453]
FormRenderer.MAPBOX_URL = 'https://api.tiles.mapbox.com/mapbox.js/v2.1.4/mapbox.js'

# Can be overridden by implementers
FormRenderer.FILE_TYPES = {}

FormRenderer.loadLeaflet = (cb) ->
  if L?.GeoJSON?
    cb()
  else if !FormRenderer.loadingLeaflet
    FormRenderer.loadingLeaflet = [cb]
    $.getScript FormRenderer.MAPBOX_URL, ->
      x() for x in FormRenderer.loadingLeaflet
  else
    FormRenderer.loadingLeaflet.push(cb)

FormRenderer.initMap = (el) ->
  L.mapbox.accessToken = 'pk.eyJ1IjoiYWRhbWphY29iYmVja2VyIiwiYSI6Im1SVEQtSm8ifQ.ZgEOSXsv9eLfGQ-9yAmtIg'
  L.mapbox.map(el, 'adamjacobbecker.ja7plkah')
