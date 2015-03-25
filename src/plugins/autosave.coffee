class FormRenderer.Plugins.Autosave extends FormRenderer.Plugins.Base
  # @todo refactor, separation of concerns, etc.
  afterFormLoad: ->
    setInterval =>
      @fr.save() if @fr.state.get('hasChanges') && !@fr.isSaving
    , 5000

    @fr.on 'attachment_modified', =>
      if @fr.state.get('hasChanges') && !@fr.isSaving
        @fr.save()
