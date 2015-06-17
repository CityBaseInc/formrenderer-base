class FormRenderer.Plugins.Prefill extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    @fr.on 'afterSave', ->
      window.location.hash = encodeURIComponent(JSON.stringify(@getValue()))

    return unless (json = @getPrefillJson())

    initHasChanges = @fr.state.get('hasChanges')

    @fr.response_fields.each (rf) ->
      if rf.input_field && (val = json[rf.id])
        rf.setExistingValue(val)

    @fr.state.set('hasChanges', initHasChanges)

  getPrefillJson: ->
    try
      $.parseJSON(decodeURIComponent(window.location.hash.replace(/^\#/, '')))
    catch
      ''
