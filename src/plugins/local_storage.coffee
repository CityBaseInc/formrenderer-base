class FormRenderer.Plugins.LocalStorage extends FormRenderer.Plugins.Base
  # @todo refactor to move draftIdStorageKey and related methods into this plugin
  beforeFormLoad: ->
    if store.enabled
      @fr.options.response.id ||= store.get(@fr.draftIdStorageKey())

      @fr.on 'afterSave', ->
        unless @fr.state.get('submitting')
          store.set @fr.draftIdStorageKey(), @fr.options.response.id
