(function() {
    var BeforeUnload;
  
    BeforeUnload = (function() {
      function BeforeUnload() {}
  
      BeforeUnload.footerText = 'Are you sure you want to leave this page?';
  
      BeforeUnload.defaults = {
        "if": function() {
          return true;
        },
        message: 'You have unsaved changes.'
      };
  
      BeforeUnload.enable = function(opts) {
        this.opts = {
          "if": opts["if"] || this.defaults["if"],
          message: opts.message || this.defaults.message,
          cb: opts.cb
        };
        this._onTurbolinksUnload = (function(_this) {
          return function(e) {
            if (!_this._willPrevent()) {
              return _this.disable();
            }
            if (_this.opts.cb) {
              if (_this.opts.cb(e.data.url) !== false) {
                return e.preventDefault();
              }
            }
            if (confirm(_this.opts.message + "\n\n" + _this.footerText)) {
              return _this.disable();
            } else {
              return e.preventDefault();
            }
          };
        })(this);
        document.body.beforeunload = this;
        window.onbeforeunload = (function(_this) {
          return function() {
            if (_this._willPrevent()) {
              return _this.opts.message;
            } else {
              return void 0;
            }
          };
        })(this);
        return document.addEventListener('page:before-change', this._onTurbolinksUnload, false);
      };
  
      BeforeUnload.disable = function() {
        window.onbeforeunload = null;
        return document.removeEventListener('page:before-change', this._onTurbolinksUnload);
      };
  
      BeforeUnload._willPrevent = function() {
        return document.body.beforeunload === this && this.opts["if"]();
      };
  
      return BeforeUnload;
  
    })();
  
    window.BeforeUnload = BeforeUnload;
  
  }).call(this);