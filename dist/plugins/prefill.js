(function() {
  var getUrlParam,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  getUrlParam = function(name) {
    var regex, results;
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    results = regex.exec(location.search);
    if (results === null) {
      return '';
    } else {
      return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
  };

  FormRenderer.Plugins.Prefill = (function(_super) {
    __extends(Prefill, _super);

    function Prefill() {
      return Prefill.__super__.constructor.apply(this, arguments);
    }

    Prefill.prototype.afterFormLoad = function() {
      var initHasChanges, json;
      if (!_.isEmpty(this.fr.options.response.responses)) {
        return;
      }
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
        return $.parseJSON(getUrlParam('prefill'));
      } catch (_error) {
        return '';
      }
    };

    return Prefill;

  })(FormRenderer.Plugins.Base);

}).call(this);
