window.FormRenderer = class FormRenderer extends Backbone.View
  @INPUT_FIELD_TYPES: [
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

  @NON_INPUT_FIELD_TYPES: [
    'block_of_text'
    'page_break'
    'section_break'
  ]

  @FIELD_TYPES = _.union @INPUT_FIELD_TYPES, @NON_INPUT_FIELD_TYPES

  @Views: {}
  @Models: {}
  @Validators: {}

  defaults:
    url: 'https://screendoor.dobt.co/responses/save'
    target: '[data-formrenderer]'
    afterSubmit: undefined
    validateImmediately: false
    response_fields: []
    response:
      id: undefined
      responses: {}
    project_id: undefined
    ignore_user: undefined
    edit_in_place: false

  events:
    'click [data-activate-page]': (e) ->
      @activatePage $(e.currentTarget).data('activate-page'), silent: true

  constructor: (options) ->
    @options = $.extend({}, @defaults, options)
    @state = new Backbone.Model
    @state.set 'hasChanges', false
    @setElement $(@options.target)
    @$el.html('')
    @$el.addClass 'form_renderer_form'
    @$el.data('form-renderer', @)
    @subviews = { pages: {} }

    # Currently there's nothing in this template...
    # @$el.html JST['main'](@)

    @constructResponseFields(@options.response_fields)
    @constructPages()
    @constructPagination()
    @constructBottomStatusBar()
    @constructErrorAlertBar()

    @subviews.pages[@state.get('activePage')].show()

    @initAutosave()
    @initBeforeUnload()

    @validateAllPages() if @options.validateImmediately

  constructResponseFields: (responseFieldsJSON) ->
    @response_fields = new FormRenderer.Collection

    for rf in responseFieldsJSON
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

  constructBottomStatusBar: ->
    @subviews.bottomStatusBar = new FormRenderer.Views.BottomStatusBar(form_renderer: @)
    @$el.append @subviews.bottomStatusBar.render().el

  constructErrorAlertBar: ->
    @subviews.errorAlertBar = new FormRenderer.Views.ErrorAlertBar(form_renderer: @)
    @$el.prepend @subviews.errorAlertBar.render().el

  activatePage: (newPageNumber, opts = {}) ->
    return unless opts.silent || @validateCurrentPage()
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
    {
      response_id: @options.response.id
      project_id: @options.project_id
      edit_in_place: @options.edit_in_place
      ignore_user: @options.ignore_user
      background_submit: true
    }

  save: (options = {}) ->
    @isSaving = true

    $.ajax
      url: @options.url
      type: 'post'
      dataType: 'json'
      data: _.extend(@saveParams(), {
        raw_responses: @getValue()
      })
      complete: =>
        @isSaving = false
        options.complete?.apply(@, arguments)
        @trigger 'afterSave'
      success: (data) =>
        @state.set 'hasChanges', false
        @state.set 'hasServerErrors', false
        @options.response.id = data.response_id
        options.success?.apply(@, arguments)
      error: =>
        @state.set 'hasServerErrors', true
        @state.set 'submitting', false
        options.error?.apply(@, arguments)

  initAutosave: ->
    setInterval =>
      @save() if @state.get('hasChanges') && !@isSaving
    , 5000

  initBeforeUnload: ->
    BeforeUnload.enable =>
      @state.get('hasChanges')
    , 'You have unsaved changes. Are you sure you want to leave this page?'

  submit: (opts = {}) ->
    return unless opts.silent || @validateAllPages()
    afterSubmit = opts.afterSubmit || @options.afterSubmit
    @state.set('submitting', true)

    if typeof afterSubmit == 'function'
      cb = afterSubmit
    else if typeof afterSubmit == 'string'
      cb = =>
        window.location = afterSubmit
    else
      cb = =>
        console.log '[FormRenderer] Not sure what to do...'

    if @state.get('hasChanges')
      @save(success: cb)
    else
      cb.apply(@)
