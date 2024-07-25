(function() {
  // Requires https://github.com/padolsey/findAndReplaceDOMText/
  FormRenderer.Plugins.I18n = class I18n extends FormRenderer.Plugins.Base {
    beforeFormLoad() {
      var translate;
      translate = (k) => {
        return window.frTranslations[this.fr.options.lang][k];
      };
      return this.fr.on('viewRendered', function(view) {
        return findAndReplaceDOMText(view.el, {
          find: /{(.*?)}/g,
          replace: function(_, matches) {
            return translate(matches[1]);
          }
        });
      });
    }

  };

}).call(this);
