class FormRenderer.Plugins.SavedSession extends FormRenderer.Plugins.Base
  beforeFormLoad: ->
    draftKey = "project-#{@fr.options.project_id}-response-id"

    @fr.options.response.id ||= Cookies.get(draftKey)

    @fr.on 'afterSave', ->
      unless @state.get('submitting')
        Cookies.set draftKey, @options.response.id

    @fr.on 'afterSubmit', ->
      Cookies.remove draftKey

    @fr.on 'errorSaving', ->
      Cookies.remove draftKey
