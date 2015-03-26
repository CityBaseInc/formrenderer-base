# Requires https://github.com/padolsey/findAndReplaceDOMText/

class FormRenderer.Plugins.I18n extends FormRenderer.Plugins.Base
  beforeFormLoad: ->
    translate = (k) =>
      window.frTranslations[@fr.options.lang][k]

    @fr.on 'viewRendered', (view) ->
      findAndReplaceDOMText(
        view.el,
        find: /{(.*?)}/g
        replace: (_, matches) ->
          translate(matches[1])
      )
