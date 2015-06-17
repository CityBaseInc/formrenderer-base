getUrlParam = (name) ->
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
  regex = new RegExp("[\\?&]" + name + "=([^&#]*)")
  results = regex.exec(location.search)
  if results == null
    ''
  else
    decodeURIComponent(results[1].replace(/\+/g, " "))

class FormRenderer.Plugins.Prefill extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    # Only prefill for new respondents
    return unless _.isEmpty(@fr.options.response.responses)
    return unless (json = @getPrefillJson())

    initHasChanges = @fr.state.get('hasChanges')

    @fr.response_fields.each (rf) ->
      if rf.input_field && (val = json[rf.id])
        rf.setExistingValue(val)

    @fr.state.set('hasChanges', initHasChanges)

  getPrefillJson: ->
    try
      $.parseJSON(getUrlParam('prefill'))
    catch
      ''
