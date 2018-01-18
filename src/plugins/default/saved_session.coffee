class FormRenderer.Plugins.SavedSession extends FormRenderer.Plugins.Base
  beforeFormLoad: ->
    draftKey = "project-#{@fr.options.project_id}-response-id"

    cookieKey = Cookies.get(draftKey)
    if cookieKey?
      if @validCookie(cookieKey)
        @fr.options.response.id ||= cookieKey
      else
        Cookies.remove draftKey

    @fr.on 'afterSave', ->
      unless @state.get('submitting')
        Cookies.set draftKey, @options.response.id

    @fr.on 'afterSubmit', ->
      Cookies.remove draftKey

    @fr.on 'errorSaving', ->
      Cookies.remove draftKey

  validCookie: (cookieValue) ->
    # The cookie is valid if it has the response_id and the encrypted hash,
    # separated by a comma. We're just looking for the comma, here.
    cookieValue.indexOf(',') != -1
