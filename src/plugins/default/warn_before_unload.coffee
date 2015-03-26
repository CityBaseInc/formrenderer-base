class FormRenderer.Plugins.WarnBeforeUnload extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    BeforeUnload.enable
      if: => @fr.state.get('hasChanges')
