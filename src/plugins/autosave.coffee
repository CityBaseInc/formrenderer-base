class FormRenderer.Plugins.Autosave extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    setInterval =>
      @fr.save() if @fr.state.get('hasChanges')
    , 5000
