window.FormRenderer = FormRenderer = Backbone.View.extend
  defaults:
    enablePages: true
    screendoorBase: 'https://screendoor.dobt.co'
    target: '[data-formrenderer]'
    validateImmediately: false
    response: {}
    preview: false
    skipValidation: undefined
    saveParams: {}
    showLabels: false
    scrollToPadding: 0
    plugins: [
      'Autosave'
      'WarnBeforeUnload'
      'BottomBar'
      'ErrorBar'
      'LocalStorage'
    ]

  ## Initialization logic

  constructor: (options) ->
    @options = $.extend {}, @defaults, options
    @requests = 0
    @state = new Backbone.Model
      hasChanges: false
    @setElement $(@options.target)
    @$el.addClass 'fr_form'
    @$el.data 'formrenderer-instance', @
    @subviews = { pages: {} }

    @plugins = _.map @options.plugins, (pluginName) =>
      new FormRenderer.Plugins[pluginName](@)

    p.beforeFormLoad?() for p in @plugins

    # Loading state
    @$el.html JST['main'](@)
    @trigger 'viewRendered', @

    @loadFromServer =>
      @$el.find('.fr_loading').remove()
      @initResponseFields()
      @initPages()
      if @options.enablePages then @initPagination() else @initNoPagination()
      p.afterFormLoad?() for p in @plugins
      @validate() if @options.validateImmediately
      @initConditions()
      @trigger 'ready'
      @options.onReady?()

    # If @$el is a <form>, make extra-sure that it can't be submitted natively
    @$el.on 'submit', (e) ->
      e.preventDefault()

    @ # explicitly return self

  corsSupported: ->
    'withCredentials' of new XMLHttpRequest()

  projectUrl: ->
    "#{@options.screendoorBase}/projects/#{@options.project_id}"

  # Fetch the details of this form from the Screendoor API
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
      error: (xhr) =>
        if !@corsSupported()
          @$el.find('.fr_loading').html("""
            Sorry, your browser does not support this embedded form. Please visit
            <a href='#{@projectUrl()}?fr_not_supported=t'>#{@projectUrl()}</a> to fill out
            this form.
          """)
        else
          @$el.find('.fr_loading').text(
            "Error loading form: \"#{xhr.responseJSON?.error || 'Unknown'}\""
          )
          @trigger 'errorSaving', xhr

  # Create a collection for our response fields
  initResponseFields: ->
    @response_fields = new Backbone.Collection

    for rf in @options.response_fields
      model = new FormRenderer.Models["ResponseField#{_str.classify(rf.field_type)}"](
        rf,
        form_renderer: @
      )
      model.setExistingValue(@options.response.responses[model.get('id')]) if model.input_field
      @response_fields.add model

    @listenTo @response_fields, 'change:value change:value.*', $.proxy(@_onChange, @)

  # Build pages, which contain the response fields views.
  initPages: ->
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

  initPagination: ->
    @subviews.pagination = new FormRenderer.Views.Pagination(form_renderer: @)
    @$el.prepend @subviews.pagination.render().el
    @subviews.pages[@state.get('activePage')].show()

  initNoPagination: ->
    for pageNumber, page of @subviews.pages
      page.show()

  initConditions: ->
    @listenTo @response_fields, 'change:value change:value.*', (rf) =>
      @runConditions(rf)

    @allConditions = _.flatten(
      @response_fields.map (rf) ->
        _.map rf.getConditions(), (c) ->
          _.extend {}, c, parent: rf
    )

  ## Pages / Validation

  activatePage: (newPageNumber) ->
    @subviews.pages[@state.get('activePage')].hide()
    @subviews.pages[newPageNumber].show()
    window.scrollTo(0, @options.scrollToPadding)
    @state.set 'activePage', newPageNumber

  validate: ->
    page.validate() for _, page of @subviews.pages
    @trigger 'afterValidate afterValidate:all'
    return @areAllPagesValid()

  isPageVisible: (pageNumber) ->
    @subviews.pages[pageNumber] &&
    !!_.find(@subviews.pages[pageNumber].models, ((rf) -> rf.isVisible))

  isPageValid: (pageNumber) ->
    !_.find(@subviews.pages[pageNumber].models, ((rf) -> rf.input_field && rf.errors.length > 0))

  focusFirstError: ->
    page = @invalidPages()[0]
    @activatePage page
    view = @subviews.pages[page].firstViewWithError()
    window.scrollTo(0, view.$el.offset().top - @options.scrollToPadding)
    view.focus()

  invalidPages: ->
    _.filter [1..@numPages], (x) =>
      @isPageValid(x) == false

  areAllPagesValid: ->
    @invalidPages().length == 0

  visiblePages: ->
    _.tap [], (a) =>
      for num, _ of @subviews.pages
        a.push(parseInt(num, 10)) if @isPageVisible(num)

  isFirstPage: ->
    first = @visiblePages()[0]
    !first || (@state.get('activePage') == first)

  isLastPage: ->
    last = _.last(@visiblePages())
    !last || (@state.get('activePage') == last)

  previousPage: ->
    @visiblePages()[_.indexOf(@visiblePages(), @state.get('activePage')) - 1]

  nextPage: ->
    @visiblePages()[_.indexOf(@visiblePages(), @state.get('activePage')) + 1]

  handlePreviousPage: ->
    @activatePage @previousPage()

  handleNextPage: ->
    if @isLastPage() || !@options.enablePages
      @submit()
    else
      @activatePage(@nextPage())

  ## Saving

  getValue: ->
    _.tap {}, (h) =>
      @response_fields.each (rf) ->
        return unless rf.input_field
        return unless rf.isVisible
        gotValue = rf.getValue()

        # hack for radio field...
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

  _onChange: ->
    @state.set('hasChanges', true)

    # Handle the edge case when the form is saved while there's an AJAX
    # request pending.
    if @isSaving
      @changedWhileSaving = true

  # Options:
  #   submit (boolean) if true, tell the server to submit the response
  #   cb (function) a callback that will be called on success
  save: (options = {}) ->
    return if @isSaving
    @requests += 1
    @isSaving = true
    @changedWhileSaving = false

    $.ajax
      url: "#{@options.screendoorBase}/api/form_renderer/save"
      type: 'post'
      dataType: 'json'
      data: _.extend @saveParams(), {
        raw_responses: @getValue(),
        submit: if options.submit then true else undefined
      }
      complete: =>
        @requests -= 1
        @isSaving = false
        @trigger 'afterSave'
      success: (data) =>
        @state.set
          hasChanges: @changedWhileSaving
          hasServerErrors: false
        @options.response.id = data.response_id
        options.cb?.apply(@, arguments)
      error: =>
        @state.set
          hasServerErrors: true
          submitting: false

  waitForRequests: (cb) ->
    if @requests > 0
      setTimeout ( => @waitForRequests(cb) ), 100
    else
      cb()

  submit: (opts = {}) ->
    return unless opts.skipValidation || @options.skipValidation || @validate()
    @state.set('submitting', true)

    @waitForRequests =>
      if @options.preview
        @_preview()
      else
        @save submit: true, cb: =>
          @trigger 'afterSubmit'
          @_afterSubmit()

  _afterSubmit: ->
    as = @options.afterSubmit

    if typeof as == 'function'
      as.call @
    else if typeof as == 'string'
      window.location = as.replace(':id', @options.response.id)
    else if typeof as == 'object' && as.method == 'page'
      $page = $("<div class='fr_after_submit_page'>#{as.html}</div>")
      @$el.replaceWith($page)
    else
      console.log '[FormRenderer] Not sure what to do...'

  _preview: ->
    cb = =>
      window.location = @options.preview.replace(':id', @options.response.id)

    # If we know the response ID and there are no changes, we can bypass
    # the call to @save() entirely
    if !@state.get('hasChanges') && @options.response.id
      cb()
    else
      @save cb: cb

  ## Conditionals - will break into separate classes

  reflectConditions: ->
    page.reflectConditions() for _, page of @subviews.pages
    @subviews.pagination?.render()

  runConditions: (rf) ->
    needsRender = false

    _.each @conditionsForResponseField(rf), (c) ->
      if c.parent.calculateVisibility()
        needsRender = true

    @reflectConditions() if needsRender

  conditionsForResponseField: (rf) ->
    _.filter @allConditions, (condition) ->
      "#{condition.response_field_id}" == "#{rf.id}"

  isConditionalVisible: (condition) ->
    new FormRenderer.ConditionChecker(@, condition).isVisible()

## Master list of field types

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

FormRenderer.FIELD_TYPES = _.union(
  FormRenderer.INPUT_FIELD_TYPES,
  FormRenderer.NON_INPUT_FIELD_TYPES
)

## Class-level configs

FormRenderer.BUTTON_CLASS = ''
FormRenderer.DEFAULT_LAT_LNG = [40.7700118, -73.9800453]
FormRenderer.MAPBOX_URL = 'https://api.tiles.mapbox.com/mapbox.js/v2.1.4/mapbox.js'

# Needs to be kept in-sync with Screendoor
FormRenderer.FILE_TYPES =
  images: ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'tif', 'tiff']
  videos: ['m4v', 'mp4', 'mov', 'mpg']
  audio: ['m4a', 'mp3', 'wav']
  docs: ['doc', 'docx', 'pdf', 'rtf', 'txt']

FormRenderer.ADD_ROW_LINK = '+ Add another row'
FormRenderer.REMOVE_ROW_LINK = '-'

## Settin' these up for later

FormRenderer.Views = {}
FormRenderer.Models = {}
FormRenderer.Validators = {}
FormRenderer.Plugins = {}

## Plugin utilities

FormRenderer.addPlugin = (x) ->
  @::defaults.plugins.push(x)

FormRenderer.removePlugin = (x) ->
  @::defaults.plugins = _.without(@::defaults.plugins, x)

## Overrideable utilities

FormRenderer.loadLeaflet = (cb) ->
  if L?.GeoJSON?
    cb()
  else
    requireOnce FormRenderer.MAPBOX_URL, cb

FormRenderer.initMap = (el) ->
  L.mapbox.accessToken = 'pk.eyJ1IjoiYWRhbWphY29iYmVja2VyIiwiYSI6Im1SVEQtSm8ifQ.ZgEOSXsv9eLfGQ-9yAmtIg'
  L.mapbox.map(el, 'adamjacobbecker.ja7plkah')

FormRenderer.getLength = (wordsOrChars, val) ->
  if wordsOrChars == 'words'
    (_str.trim(val).replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || '').length
  else
    _str.trim(val).replace(/\s/g, '').length

autoLink = (str) ->
  pattern = ///
    (^|[\s\n]|<br\/?>) # Capture the beginning of string or line or leading whitespace
    (
      (?:https?|ftp):// # Look for a valid URL protocol (non-captured)
      [\-A-Z0-9+\u0026\u2019@#/%?=()~_|!:,.;]* # Valid URL characters (any number of times)
      [\-A-Z0-9+\u0026@#/%=~()_|] # String must end in a valid URL character
    )
  ///gi

  str.replace(pattern, "$1<a href='$2' target='_blank'>$2</a>")

sanitizeConfig = _.extend {}, Sanitize.Config.RELAXED
sanitizeConfig.attributes.a.push 'target'

sanitize = (str, config) ->
  try
    n = document.createElement('div')
    n.innerHTML = str
    s = new Sanitize(config or Sanitize.Config.RELAXED)
    c = s.clean_node(n)
    o = document.createElement('div')
    o.appendChild c.cloneNode(true)
    return o.innerHTML
  catch e
    return _.escape(str)

simpleFormat = (str = '') ->
  "#{str}".replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br />' + '$2')

FormRenderer.formatHTML = (unsafeHTML) ->
  sanitize(
    autoLink(
      simpleFormat(unsafeHTML)
    ),
    sanitizeConfig
  )

FormRenderer.toBoolean = (str) ->
  _.contains ['True', 'Yes', 'true', '1', 1, 'yes', true], str
