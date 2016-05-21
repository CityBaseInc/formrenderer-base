paramName = 'frDraft'

getUrlParam = (name) ->
  url = window.location.href
  name = name.replace(/[\[\]]/g, "\\$&");
  regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)")
  results = regex.exec(url)
  if !results
    return null
  if !results[2]
    return ''
  decodeURIComponent(results[2].replace(/\+/g, " "))

class FormRenderer.Plugins.BookmarkDraft extends FormRenderer.Plugins.Base
  beforeFormLoad: ->
    if (id = getUrlParam(paramName))
      @fr.options.response.id ||= id

  afterFormLoad: ->
    @fr.subviews.bookmarkDraft = new FormRenderer.Plugins.BookmarkDraft.View(form_renderer: @fr)
    @fr.$el.append @fr.subviews.bookmarkDraft.render().el

FormRenderer.Plugins.BookmarkDraft.View = Backbone.View.extend
  events:
    'click .js-fr-bookmark': 'showBookmark'

  initialize: (options) ->
    @form_renderer = options.form_renderer

  render: ->
    @$el.html JST['plugins/bookmark_draft'](@)
    @form_renderer.trigger 'viewRendered', @
    @

  finishLink: ->
    url = document.URL
    sep = if url.indexOf('?') > -1 then '&' else '?'
    "#{url}#{sep}#{paramName}=#{@form_renderer.options.response.id}"

  showBookmark: (e) ->
    e.preventDefault()

    cb = =>
      @render()
      prompt(FormRenderer.t.bookmark_hint, @finishLink())

    if @form_renderer.options.response.id
      cb()
    else
      @$el.find('a').text(FormRenderer.t.saving)
      @form_renderer.waitForRequests =>
        if @form_renderer.options.response.id
          cb()
        else
          @form_renderer.save cb: cb
