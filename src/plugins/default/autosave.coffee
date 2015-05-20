class FormRenderer.Plugins.Autosave extends FormRenderer.Plugins.Base
  defaultInterval: 5000
  maxInterval: 40000

  afterFormLoad: ->
    @interval = @defaultInterval

    @fr.on 'afterSave:error', =>
      @interval = Math.min(@interval * 2, @maxInterval)
      @clearTimeout()
      @setTimeout()

    @fr.on 'afterSave:success', =>
      @interval = @defaultInterval
      @clearTimeout()
      @setTimeout()

    @setTimeout()

  autosave:  ->
    @fr.save() if @fr.state.get('hasChanges')
    @setTimeout()

  setTimeout: ->
    console.log "setting timeout for #{@interval}..."

    setTimeout =>
      @autosave()
    , @interval
