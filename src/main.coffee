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
    # onReady:

  ## Initialization logic

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
      @initResponseFields()
      @initPages()
      if @options.enablePages then @initPagination() else @initNoPagination()
      @initBottomStatusBar() if @options.enableBottomStatusBar
      @initErrorAlertBar() if @options.enableErrorAlertBar
      @initAutosave() if @options.enableAutosave
      @initBeforeUnload() if @options.enableBeforeUnload
      @validateAllPages() if @options.validateImmediately
      @initConditions()
      @trigger 'ready'
      @options.onReady?()

    @ # explicitly return self

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
      error: (xhr) =>
        @$el.find('.fr_loading').text(
          "Error loading form: \"#{xhr.responseJSON?.error || 'Unknown'}\""
        )
        store.remove @draftIdStorageKey()

  initResponseFields: ->
    @response_fields = new Backbone.Collection

    for rf in @options.response_fields
      model = new FormRenderer.Models["ResponseField#{_.str.classify(rf.field_type)}"](
        rf,
        form_renderer: @
      )
      model.setExistingValue(@options.response.responses[model.get('id')]) if model.input_field
      @response_fields.add model

    @listenTo @response_fields, 'change', ->
      @state.set('hasChanges', true) unless @state.get('hasChanges')

  initAutosave: ->
    setInterval =>
      @save() if @state.get('hasChanges') && !@isSaving
    , 5000

  initBottomStatusBar: ->
    @subviews.bottomStatusBar = new FormRenderer.Views.BottomStatusBar(form_renderer: @)
    @$el.append @subviews.bottomStatusBar.render().el

  initErrorAlertBar: ->
    @subviews.errorAlertBar = new FormRenderer.Views.ErrorAlertBar(form_renderer: @)
    @$el.prepend @subviews.errorAlertBar.render().el

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

  initBeforeUnload: ->
    BeforeUnload.enable
      if: => @state.get('hasChanges')

  ## Pages / Validation

  activatePage: (newPageNumber, opts = {}) ->
    return unless opts.skipValidation || @validateCurrentPage()
    @subviews.pages[@state.get('activePage')].hide()
    @subviews.pages[newPageNumber].show()
    @state.set 'activePage', newPageNumber

  validateCurrentPage: ->
    @trigger "beforeValidate beforeValidate:#{@state.get('activePage')}"
    @subviews.pages[@state.get('activePage')].validate()
    @trigger "afterValidate afterValidate:#{@state.get('activePage')}"
    return @isPageValid(@state.get('activePage'))

  validateAllPages: ->
    @trigger 'beforeValidate beforeValidate:all'

    for _, page of @subviews.pages
      page.validate()

    @trigger 'afterValidate afterValidate:all'

    return @areAllPagesValid()

  isPageVisible: (pageNumber) ->
    !!_.find(@subviews.pages[pageNumber].models, ((rf) -> rf.isVisible))

  isPageValid: (pageNumber) ->
    !_.find(@subviews.pages[pageNumber].models, ((rf) -> rf.input_field && rf.errors.length > 0))

  areAllPagesValid: ->
    _.every [1..@numPages], (x) =>
      @isPageValid(x)

  numValidationErrors: ->
    @response_fields.filter((rf) -> rf.input_field && rf.errors.length > 0).length

  # memoize

  visiblePages: ->
    _.tap [], (a) =>
      for num, _ of @subviews.pages
        a.push(parseInt(num, 10)) if @isPageVisible(num)

  isFirstPage: ->
    @state.get('activePage') == @visiblePages()[0]

  isLastPage: ->
    @state.get('activePage') == _.last(@visiblePages())

  previousPage: ->
    @visiblePages()[_.indexOf(@visiblePages(), @state.get('activePage')) - 1]

  nextPage: ->
    @visiblePages()[_.indexOf(@visiblePages(), @state.get('activePage')) + 1]

  ## Localstorage

  draftIdStorageKey: ->
    "project-#{@options.project_id}-response-id"

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

  autosaveImmediately: ->
    if @state.get('hasChanges') && !@isSaving && @options.enableAutosave
      @save()

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

  ## Conditionals - will break into separate classes

  reflectConditions: ->
    page.reflectConditions() for _, page of @subviews.pages
    @subviews.pagination?.render()

  runConditions: (rf) ->
    _.each @conditionsForResponseField(rf), (c) ->
      c.parent.calculateVisibility()

    @reflectConditions()

  conditionsForResponseField: (rf) ->
    _.filter @allConditions, (condition) ->
      "#{condition.response_field_id}" == "#{rf.id}"

  initConditions: ->
    @listenTo @response_fields, 'change:value change:value.*', (rf) =>
      @runConditions(rf)

    @allConditions = _.flatten(
      @response_fields.map (rf) ->
        _.map rf.getConditions(), (c) ->
          _.extend {}, c, parent: rf
    )

  isConditionalVisible: (condition) ->
    new FormRenderer.ConditionChecker(@, condition).isVisible()

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
  else
    requireOnce FormRenderer.MAPBOX_URL, cb

FormRenderer.initMap = (el) ->
  L.mapbox.accessToken = 'pk.eyJ1IjoiYWRhbWphY29iYmVja2VyIiwiYSI6Im1SVEQtSm8ifQ.ZgEOSXsv9eLfGQ-9yAmtIg'
  L.mapbox.map(el, 'adamjacobbecker.ja7plkah')

FormRenderer.getLength = (wordsOrChars, val) ->
  if wordsOrChars == 'words'
    (_.str.trim(val).replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || '').length
  else
    _.str.trim(val).replace(/\s/g, '').length

commonCountries = ['US', 'GB', 'CA']

FormRenderer.ORDERED_COUNTRIES = _.uniq(
  _.union commonCountries, [undefined], _.keys(ISOCountryNames)
)

FormRenderer.errors =
  blank: "This field can't be blank."
  invalid_date: 'Please enter a valid date.'
  invalid_email: 'Please enter a valid email address.'
  invalid_integer: 'Please enter a whole number.'
  invalid_number: 'Please enter a valid number.'
  invalid_price: 'Please enter a valid price.'
  invalid_time: 'Please enter a valid time.'
  too_large: 'Your answer is too large.'
  too_long: 'Your answer is too long.'
  too_short: 'Your answer is too short.'
  too_small: 'Your answer is too small.'

# Hardcoded for now, since these are way less likely to change than
# the country names list.

FormRenderer.PROVINCES_CA = [
  'Alberta'
  'British Columbia'
  'Labrador'
  'Manitoba'
  'New Brunswick'
  'Newfoundland'
  'Nova Scotia'
  'Nunavut'
  'Northwest Territories'
  'Ontario'
  'Prince Edward Island'
  'Quebec'
  'Saskatchewen'
  'Yukon'
]

FormRenderer.PROVINCES_US = [
  'Alabama'
  'Alaska'
  'American Samoa'
  'Arizona'
  'Arkansas'
  'California'
  'Colorado'
  'Connecticut'
  'Delaware'
  'District Of Columbia'
  'Federated States Of Micronesia'
  'Florida'
  'Georgia'
  'Guam'
  'Hawaii'
  'Idaho'
  'Illinois'
  'Indiana'
  'Iowa'
  'Kansas'
  'Kentucky'
  'Louisiana'
  'Maine'
  'Marshall Islands'
  'Maryland'
  'Massachusetts'
  'Michigan'
  'Minnesota'
  'Mississippi'
  'Missouri'
  'Montana'
  'Nebraska'
  'Nevada'
  'New Hampshire'
  'New Jersey'
  'New Mexico'
  'New York'
  'North Carolina'
  'North Dakota'
  'Northern Mariana Islands'
  'Ohio'
  'Oklahoma'
  'Oregon'
  'Palau'
  'Pennsylvania'
  'Puerto Rico'
  'Rhode Island'
  'South Carolina'
  'South Dakota'
  'Tennessee'
  'Texas'
  'Utah'
  'Vermont'
  'Virgin Islands'
  'Virginia'
  'Washington'
  'West Virginia'
  'Wisconsin'
  'Wyoming'
]

FormRenderer.ADD_ROW_LINK = '+ Add another row'
FormRenderer.REMOVE_ROW_LINK = '-'
