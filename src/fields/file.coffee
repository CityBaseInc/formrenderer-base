FormRenderer.Models.ResponseFieldFile = FormRenderer.Models.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'file'
  addFile: (id, filename) ->
    files = @getFiles().slice(0)
    files.push(id: id, filename: filename)
    @set 'value', files
  removeFile: (idx) ->
    files = @getFiles().slice(0)
    files.splice(idx, 1)
    @set 'value', files
  getFiles: ->
    @get('value') || []
  canAddFile: ->
    @getFiles().length < @maxFiles()
  toText: ->
    _.compact(_.pluck(@getFiles(), 'filename')).join(' ')
  hasValue: ->
    _.any @getFiles(), (h) ->
      !!h.id
  getAcceptedExtensions: ->
    if (x = FormRenderer.FILE_TYPES[@get('file_types')])
      _.map x, (x) -> ".#{x}"
  getValue: ->
    @getFiles()
  maxFiles: ->
    if @get('allow_multiple_files')
      10
    else
      1

FormRenderer.Views.ResponseFieldFile = FormRenderer.Views.ResponseField.extend
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

