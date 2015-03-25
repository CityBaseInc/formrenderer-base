class FormRenderer.Plugins.LocalStorage extends FormRenderer.Plugins.Base
  beforeFormLoad: ->
    # Store has its own check to see if the browser supports localstorage
    return unless store.enabled

    draftKey = "project-#{@fr.options.project_id}-response-id"

    @fr.options.response.id ||= store.get(draftKey)

    @fr.on 'afterSave', ->
      unless @fr.state.get('submitting')
        store.set draftKey, @fr.options.response.id

    @fr.on 'afterSubmit', ->
      store.remove draftKey

    @fr.on 'errorSaving', ->
      store.remove draftKey
