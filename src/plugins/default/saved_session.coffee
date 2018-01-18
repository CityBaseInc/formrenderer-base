class FormRenderer.Plugins.SavedSession extends FormRenderer.Plugins.Base
  beforeFormLoad: ->
    draftKey = "project-#{@fr.options.project_id}-response-id"

    # We only want to grab a response ID from the cookie if we haven't already
    # generated one from within FormRenderer (i.e. on a first-time page load).
    # In this situation, the Cookies object is actually an object that only
    # contains a `remove` method, and calling `get` on it throws an exception.
    unless @fr.options.response.id?
      cookieKey = Cookies.get(draftKey)

    # If we got a key from the cookie, we want to make sure it's a valid one
    # before setting it as our response ID. If it's invalid, we clear the cookie
    # and leave the response ID unset so we can generate one within FormRenderer.
    if cookieKey?
      if validCookie(cookieKey)
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
