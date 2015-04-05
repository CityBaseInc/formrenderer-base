class FormRenderer.Plugins.PageState extends FormRenderer.Plugins.Base
  afterFormLoad: ->
    if num = window.location.hash.match(/page([0-9]+)/)?[1]
      page = parseInt(num, 10)
      if @fr.isPageVisible(page)
        @fr.activatePage(page)

    @fr.state.on 'change:activePage', (_, num) ->
      window.location.hash = "page#{num}"
