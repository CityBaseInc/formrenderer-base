(function() {
  var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  FormRenderer.Plugins.I18n = (function(superClass) {
    extend(I18n, superClass);

    function I18n() {
      return I18n.__super__.constructor.apply(this, arguments);
    }

    I18n.prototype.beforeFormLoad = function() {
      var translate;
      translate = (function(_this) {
        return function(k) {
          return window.frTranslations[_this.fr.options.lang][k];
        };
      })(this);
      return this.fr.on('viewRendered', function(view) {
        return findAndReplaceDOMText(view.el, {
          find: /{(.*?)}/g,
          replace: function(_, matches) {
            return translate(matches[1]);
          }
        });
      });
    };

    return I18n;

  })(FormRenderer.Plugins.Base);

}).call(this);
