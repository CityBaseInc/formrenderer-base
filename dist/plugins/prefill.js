(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Plugins.Prefill = (function(_super) {
    __extends(Prefill, _super);

    function Prefill() {
      return Prefill.__super__.constructor.apply(this, arguments);
    }

    Prefill.prototype.afterFormLoad = function() {
      var initHasChanges, json;
      this.fr.on('afterSave', function() {
        return window.location.hash = encodeURIComponent(JSON.stringify(this.getValue()));
      });
      if (!(json = this.getPrefillJson())) {
        return;
      }
      initHasChanges = this.fr.state.get('hasChanges');
      this.fr.response_fields.each(function(rf) {
        var val;
        if (rf.input_field && (val = json[rf.id])) {
          return rf.setExistingValue(val);
        }
      });
      return this.fr.state.set('hasChanges', initHasChanges);
    };

    Prefill.prototype.getPrefillJson = function() {
      try {
        return $.parseJSON(decodeURIComponent(window.location.hash.replace(/^\#/, '')));
      } catch (_error) {
        return '';
      }
    };

    return Prefill;

  })(FormRenderer.Plugins.Base);

}).call(this);
