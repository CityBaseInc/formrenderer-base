(function(window){var $, _str;

$ = jQuery;

_str = _.str;

rivets.inputEvent = document.addEventListener ? 'input' : 'keyup';

rivets.binders.input = {
  publishes: true,
  routine: rivets.binders.value.routine,
  bind: function(el) {
    return $(el).bind("" + rivets.inputEvent + ".rivets", this.publish);
  },
  unbind: function(el) {
    return $(el).unbind("" + rivets.inputEvent + ".rivets");
  }
};

rivets.binders.checkedarray = {
  publishes: true,
  routine: function(el, value) {
    return el.checked = _.contains(value, el.value);
  },
  bind: function(el) {
    if (el.type === 'radio') {
      return $(el).bind('change.rivets', (function(_this) {
        return function() {
          return _this.model.set(_this.keypath, [el.value]);
        };
      })(this));
    } else {
      return $(el).bind('change.rivets', (function(_this) {
        return function() {
          var newVal, val;
          val = _this.model.get(_this.keypath) || [];
          newVal = el.checked ? _.uniq(val.concat(el.value)) : _.without(val, el.value);
          return _this.model.set(_this.keypath, newVal);
        };
      })(this));
    }
  },
  unbind: function(el) {
    return $(el).unbind('change.rivets');
  }
};

rivets.configure({
  prefix: "rv",
  adapter: {
    subscribe: function(obj, keypath, callback) {
      callback.wrapped = function(m, v) {
        return callback(v);
      };
      return obj.on('change:' + keypath, callback.wrapped);
    },
    unsubscribe: function(obj, keypath, callback) {
      return obj.off('change:' + keypath, callback.wrapped);
    },
    read: function(obj, keypath) {
      if (keypath === "cid") {
        return obj.cid;
      }
      return obj.get(keypath);
    },
    publish: function(obj, keypath, value) {
      if (obj.cid) {
        return obj.set(keypath, value);
      } else {
        return obj[keypath] = value;
      }
    }
  }
});

(function() {
  var FormRenderer;

  window.FormRenderer = FormRenderer = Backbone.View.extend({
    defaults: {
      enablePages: true,
      screendoorBase: 'https://screendoor.dobt.co',
      target: '[data-formrenderer]',
      validateImmediately: false,
      response: {},
      responderLanguage: void 0,
      preview: false,
      skipValidation: void 0,
      saveParams: {},
      showLabels: false,
      scrollToPadding: 0,
      plugins: ['Autosave', 'WarnBeforeUnload', 'BottomBar', 'ErrorBar', 'SavedSession']
    },
    constructor: function(options) {
      var p, _i, _len, _ref;
      this.fr = this;
      this.options = $.extend({}, this.defaults, options);
      this.requests = 0;
      this.state = new Backbone.Model({
        hasChanges: false
      });
      this.setElement($(this.options.target));
      this.$el.addClass('fr_form');
      this.$el.data('formrenderer-instance', this);
      this.subviews = {
        pages: {}
      };
      this.serverHeaders = {
        'X-FR-Version': FormRenderer.VERSION,
        'X-FR-URL': document.URL
      };
      this.plugins = _.map(this.options.plugins, (function(_this) {
        return function(pluginName) {
          return new FormRenderer.Plugins[pluginName](_this);
        };
      })(this));
      _ref = this.plugins;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        if (typeof p.beforeFormLoad === "function") {
          p.beforeFormLoad();
        }
      }
      this.$el.html(JST['main'](this));
      this.trigger('viewRendered', this);
      this.loadFromServer((function(_this) {
        return function() {
          var _base, _j, _len1, _ref1;
          _this.$el.find('.fr_loading').remove();
          _this.initFormComponents(_this.options.response_fields, _this.options.response.responses);
          _this.initPages();
          if (_this.options.enablePages) {
            _this.initPagination();
          } else {
            _this.initNoPagination();
          }
          _ref1 = _this.plugins;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            p = _ref1[_j];
            if (typeof p.afterFormLoad === "function") {
              p.afterFormLoad();
            }
          }
          if (_this.options.validateImmediately) {
            _this.validate();
          }
          _this.trigger('ready');
          return typeof (_base = _this.options).onReady === "function" ? _base.onReady() : void 0;
        };
      })(this));
      this.$el.on('submit', function(e) {
        return e.preventDefault();
      });
      return this;
    },
    corsSupported: function() {
      return 'withCredentials' in new XMLHttpRequest();
    },
    projectUrl: function() {
      return "" + this.options.screendoorBase + "/projects/" + this.options.project_id;
    },
    loadFromServer: function(cb) {
      if ((this.options.response_fields != null) && (this.options.response.responses != null)) {
        return cb();
      }
      return $.ajax({
        url: "" + this.options.screendoorBase + "/api/form_renderer/load",
        type: 'get',
        dataType: 'json',
        data: this.loadParams(),
        headers: this.serverHeaders,
        success: (function(_this) {
          return function(data) {
            var _base, _base1, _ref;
            _this.options.response.id = data.response_id;
            (_base = _this.options).response_fields || (_base.response_fields = data.project.response_fields);
            (_base1 = _this.options.response).responses || (_base1.responses = ((_ref = data.response) != null ? _ref.responses : void 0) || {});
            if (_this.options.afterSubmit == null) {
              _this.options.afterSubmit = {
                method: 'page',
                html: data.project.after_response_page_html || ("<p>" + FormRenderer.t.thanks + "</p>")
              };
            }
            return cb();
          };
        })(this),
        error: (function(_this) {
          return function(xhr) {
            var _ref;
            if (!_this.corsSupported()) {
              return _this.$el.find('.fr_loading').html(FormRenderer.t.not_supported.replace(/\:url/g, _this.projectUrl()));
            } else {
              _this.$el.find('.fr_loading').text("" + FormRenderer.t.error_loading + ": \"" + (((_ref = xhr.responseJSON) != null ? _ref.error : void 0) || 'Unknown') + "\"");
              return _this.trigger('errorSaving', xhr);
            }
          };
        })(this)
      });
    },
    initPages: function() {
      var addPage, currentPageInLoop, page, pageNumber, _ref, _results;
      addPage = (function(_this) {
        return function() {
          return _this.subviews.pages[currentPageInLoop] = new FormRenderer.Views.Page({
            form_renderer: _this
          });
        };
      })(this);
      this.numPages = this.formComponents.where({
        field_type: 'page_break'
      }).length + 1;
      this.state.set('activePage', 1);
      currentPageInLoop = 1;
      addPage();
      this.formComponents.each((function(_this) {
        return function(rf) {
          if (rf.get('field_type') === 'page_break') {
            currentPageInLoop++;
            return addPage();
          } else {
            return _this.subviews.pages[currentPageInLoop].models.push(rf);
          }
        };
      })(this));
      _ref = this.subviews.pages;
      _results = [];
      for (pageNumber in _ref) {
        page = _ref[pageNumber];
        _results.push(this.$el.append(page.render().el));
      }
      return _results;
    },
    initPagination: function() {
      this.subviews.pagination = new FormRenderer.Views.Pagination({
        form_renderer: this
      });
      this.$el.prepend(this.subviews.pagination.render().el);
      return this.subviews.pages[this.state.get('activePage')].show();
    },
    initNoPagination: function() {
      var page, pageNumber, _ref, _results;
      _ref = this.subviews.pages;
      _results = [];
      for (pageNumber in _ref) {
        page = _ref[pageNumber];
        _results.push(page.show());
      }
      return _results;
    },
    activatePage: function(newPageNumber) {
      this.subviews.pages[this.state.get('activePage')].hide();
      this.subviews.pages[newPageNumber].show();
      window.scrollTo(0, this.options.scrollToPadding);
      return this.state.set('activePage', newPageNumber);
    },
    validate: function() {
      var page, _, _ref;
      _ref = this.subviews.pages;
      for (_ in _ref) {
        page = _ref[_];
        page.validate();
      }
      this.trigger('afterValidate afterValidate:all');
      return this.areAllPagesValid();
    },
    isPageVisible: function(pageNumber) {
      var _ref;
      return (_ref = this.subviews.pages[pageNumber]) != null ? _ref.isVisible() : void 0;
    },
    isPageValid: function(pageNumber) {
      var _ref;
      return (_ref = this.subviews.pages[pageNumber]) != null ? _ref.isValid() : void 0;
    },
    focusFirstError: function() {
      var page, view;
      page = this.invalidPages()[0];
      this.activatePage(page);
      view = this.subviews.pages[page].firstViewWithError();
      window.scrollTo(0, view.$el.offset().top - this.options.scrollToPadding);
      return view.focus();
    },
    invalidPages: function() {
      var _i, _ref, _results;
      return _.filter((function() {
        _results = [];
        for (var _i = 1, _ref = this.numPages; 1 <= _ref ? _i <= _ref : _i >= _ref; 1 <= _ref ? _i++ : _i--){ _results.push(_i); }
        return _results;
      }).apply(this), (function(_this) {
        return function(x) {
          return _this.isPageValid(x) === false;
        };
      })(this));
    },
    areAllPagesValid: function() {
      return this.invalidPages().length === 0;
    },
    visiblePages: function() {
      return _.tap([], (function(_this) {
        return function(a) {
          var num, _, _ref, _results;
          _ref = _this.subviews.pages;
          _results = [];
          for (num in _ref) {
            _ = _ref[num];
            if (_this.isPageVisible(num)) {
              _results.push(a.push(parseInt(num, 10)));
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        };
      })(this));
    },
    isFirstPage: function() {
      var first;
      first = this.visiblePages()[0];
      return !first || (this.state.get('activePage') === first);
    },
    isLastPage: function() {
      var last;
      last = _.last(this.visiblePages());
      return !last || (this.state.get('activePage') === last);
    },
    previousPage: function() {
      return this.visiblePages()[_.indexOf(this.visiblePages(), this.state.get('activePage')) - 1];
    },
    nextPage: function() {
      return this.visiblePages()[_.indexOf(this.visiblePages(), this.state.get('activePage')) + 1];
    },
    handlePreviousPage: function() {
      return this.activatePage(this.previousPage());
    },
    handleNextPage: function() {
      if (this.isLastPage() || !this.options.enablePages) {
        return this.submit();
      } else {
        return this.activatePage(this.nextPage());
      }
    },
    loadParams: function() {
      return {
        v: 0,
        response_id: this.options.response.id,
        project_id: this.options.project_id,
        responder_language: this.options.responderLanguage
      };
    },
    saveParams: function() {
      return _.extend(this.loadParams(), {
        skip_validation: this.options.skipValidation
      }, this.options.saveParams);
    },
    responsesChanged: function() {
      this.state.set('hasChanges', true);
      if (this.isSaving) {
        return this.changedWhileSaving = true;
      }
    },
    save: function(options) {
      if (options == null) {
        options = {};
      }
      if (this.isSaving) {
        return;
      }
      this.requests += 1;
      this.isSaving = true;
      this.changedWhileSaving = false;
      return $.ajax({
        url: "" + this.options.screendoorBase + "/api/form_renderer/save",
        type: 'post',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(_.extend(this.saveParams(), {
          raw_responses: this.getValue(),
          submit: options.submit ? true : void 0
        })),
        headers: this.serverHeaders,
        complete: (function(_this) {
          return function() {
            _this.requests -= 1;
            _this.isSaving = false;
            return _this.trigger('afterSave');
          };
        })(this),
        success: (function(_this) {
          return function(data) {
            var _ref;
            _this.state.set({
              hasChanges: _this.changedWhileSaving,
              hasServerErrors: false
            });
            _this.options.response.id = data.response_id;
            return (_ref = options.cb) != null ? _ref.apply(_this, arguments) : void 0;
          };
        })(this),
        error: (function(_this) {
          return function(xhr) {
            var _ref, _ref1;
            return _this.state.set({
              hasServerErrors: true,
              serverErrorText: (_ref = xhr.responseJSON) != null ? _ref.error : void 0,
              serverErrorKey: (_ref1 = xhr.responseJSON) != null ? _ref1.error_key : void 0,
              submitting: false
            });
          };
        })(this)
      });
    },
    waitForRequests: function(cb) {
      if (this.requests > 0) {
        return setTimeout(((function(_this) {
          return function() {
            return _this.waitForRequests(cb);
          };
        })(this)), 100);
      } else {
        return cb();
      }
    },
    submit: function(opts) {
      if (opts == null) {
        opts = {};
      }
      if (!(opts.skipValidation || this.options.skipValidation || this.validate())) {
        return;
      }
      this.state.set('submitting', true);
      return this.waitForRequests((function(_this) {
        return function() {
          if (_this.options.preview) {
            return _this._preview();
          } else {
            return _this.save({
              submit: true,
              cb: function() {
                _this.trigger('afterSubmit');
                return _this._afterSubmit();
              }
            });
          }
        };
      })(this));
    },
    _afterSubmit: function() {
      var $page, as;
      as = this.options.afterSubmit;
      if (typeof as === 'function') {
        return as.call(this);
      } else if (typeof as === 'string') {
        return window.location = as.replace(':id', this.options.response.id.split(',')[0]);
      } else if (typeof as === 'object' && as.method === 'page') {
        $page = $("<div class='fr_after_submit_page'>" + as.html + "</div>");
        return this.$el.replaceWith($page);
      } else {
        return console.log('[FormRenderer] Not sure what to do...');
      }
    },
    _preview: function() {
      var cb;
      cb = (function(_this) {
        return function() {
          return window.location = _this.options.preview.replace(':id', _this.options.response.id.split(',')[0]);
        };
      })(this);
      if (!this.state.get('hasChanges') && this.options.response.id) {
        return cb();
      } else {
        return this.save({
          cb: cb
        });
      }
    },
    reflectConditions: function() {
      var page, _, _ref, _ref1;
      _ref = this.subviews.pages;
      for (_ in _ref) {
        page = _ref[_];
        page.reflectConditions();
      }
      return (_ref1 = this.subviews.pagination) != null ? _ref1.render() : void 0;
    }
  });

  FormRenderer.BUTTON_CLASS = 'fr_button';

  FormRenderer.DEFAULT_LAT_LNG = [40.7700118, -73.9800453];

  FormRenderer.MAPBOX_URL = 'https://api.tiles.mapbox.com/mapbox.js/v2.1.4/mapbox.js';

  FormRenderer.EMAIL_REGEX = /^\s*([^@\s]{1,64})@((?:[-a-z0-9]+\.)+[a-z]{2,})\s*$/i;

  FormRenderer.ADD_ROW_ICON = '+';

  FormRenderer.REMOVE_ROW_ICON = '-';

  FormRenderer.Views = {};

  FormRenderer.Models = {};

  FormRenderer.Plugins = {};

  FormRenderer.addPlugin = function(x) {
    return this.prototype.defaults.plugins.push(x);
  };

  FormRenderer.removePlugin = function(x) {
    return this.prototype.defaults.plugins = _.without(this.prototype.defaults.plugins, x);
  };

}).call(this);

(function() {
  FormRenderer.formComponentViewClass = function(field) {
    var foundKlass;
    if (field.group) {
      return FormRenderer.Views.RepeatingGroup;
    } else if ((foundKlass = FormRenderer.Views["ResponseField" + (_str.classify(field.field_type))])) {
      return foundKlass;
    } else {
      return FormRenderer.Views.ResponseField;
    }
  };

  FormRenderer.buildFormComponentView = function(field, fr) {
    var klass;
    klass = FormRenderer.formComponentViewClass(field);
    return new klass({
      model: field,
      form_renderer: fr
    });
  };

}).call(this);

(function() {
  var autoLink, sanitize, sanitizeConfig, simpleFormat;

  autoLink = function(str) {
    var pattern;
    pattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
    return str.replace(pattern, "$1<a href='$2' target='_blank'>$2</a>");
  };

  sanitizeConfig = _.extend({}, Sanitize.Config.RELAXED);

  sanitizeConfig.attributes.a.push('target');

  sanitize = function(str, config) {
    var c, e, n, o, s;
    try {
      n = document.createElement('div');
      n.innerHTML = str;
      s = new Sanitize(config || Sanitize.Config.RELAXED);
      c = s.clean_node(n);
      o = document.createElement('div');
      o.appendChild(c.cloneNode(true));
      return o.innerHTML;
    } catch (_error) {
      e = _error;
      return _.escape(str);
    }
  };

  simpleFormat = function(str) {
    if (str == null) {
      str = '';
    }
    return ("" + str).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br />' + '$2');
  };

  FormRenderer.formatHTML = function(unsafeHTML) {
    return sanitize(autoLink(simpleFormat(unsafeHTML)), sanitizeConfig);
  };

}).call(this);

(function() {
  FormRenderer.getLength = function(wordsOrChars, val) {
    var trimmed;
    trimmed = _str.trim(val);
    if (wordsOrChars === 'words') {
      return (trimmed.replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || '').length;
    } else {
      return trimmed.length;
    }
  };

}).call(this);

(function() {
  FormRenderer.normalizeNumber = function(value, units) {
    var returnVal;
    returnVal = value.replace(/,/g, '').replace(/-/g, '').replace(/^\+/, '').trim();
    if (units) {
      returnVal = returnVal.replace(new RegExp(units + '$', 'i'), '').trim();
    }
    return returnVal;
  };

}).call(this);

(function() {
  FormRenderer.toBoolean = function(str) {
    return _.contains(['True', 'Yes', 'true', '1', 1, 'yes', true], str);
  };

}).call(this);

(function() {
  FormRenderer.VERSION = '1.0.0';

}).call(this);

(function() {
  var commonCountries;

  commonCountries = ['US', 'GB', 'CA'];

  FormRenderer.ORDERED_COUNTRIES = _.uniq(_.union(commonCountries, [void 0], _.keys(ISOCountryNames)));

  FormRenderer.PROVINCES_CA = ['Alberta', 'British Columbia', 'Labrador', 'Manitoba', 'New Brunswick', 'Newfoundland', 'Nova Scotia', 'Nunavut', 'Northwest Territories', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewen', 'Yukon'];

  FormRenderer.PROVINCES_US = ['Alabama', 'Alaska', 'American Samoa', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District Of Columbia', 'Federated States Of Micronesia', 'Florida', 'Georgia', 'Guam', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Marshall Islands', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Northern Mariana Islands', 'Ohio', 'Oklahoma', 'Oregon', 'Palau', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virgin Islands', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];

}).call(this);

(function() {
  var presenceMethods,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  presenceMethods = ['present', 'blank'];

  FormRenderer.ConditionChecker = (function() {
    function ConditionChecker(responseField, condition) {
      var _ref;
      this.responseField = responseField;
      this.condition = condition;
      this.value = ((_ref = this.responseField) != null ? _ref.toText() : void 0) || '';
    }

    ConditionChecker.prototype.method_eq = function() {
      return this.value.toLowerCase() === this.condition.value.toLowerCase();
    };

    ConditionChecker.prototype.method_contains = function() {
      return this.value.toLowerCase().indexOf(this.condition.value.toLowerCase()) > -1;
    };

    ConditionChecker.prototype.method_not = function() {
      return !this.method_eq();
    };

    ConditionChecker.prototype.method_does_not_contain = function() {
      return !this.method_contains();
    };

    ConditionChecker.prototype.method_gt = function() {
      return parseFloat(this.value) > parseFloat(this.condition.value);
    };

    ConditionChecker.prototype.method_lt = function() {
      return parseFloat(this.value) < parseFloat(this.condition.value);
    };

    ConditionChecker.prototype.method_shorter = function() {
      return this.length() < parseInt(this.condition.value, 10);
    };

    ConditionChecker.prototype.method_longer = function() {
      return this.length() > parseInt(this.condition.value, 10);
    };

    ConditionChecker.prototype.method_present = function() {
      return !!this.value.match(/\S/);
    };

    ConditionChecker.prototype.method_blank = function() {
      return !this.method_present();
    };

    ConditionChecker.prototype.length = function() {
      return FormRenderer.getLength(this.responseField.getLengthValidationUnits(), this.value);
    };

    ConditionChecker.prototype.isValid = function() {
      var _ref;
      return this.responseField && _.all(['response_field_id', 'method'], ((function(_this) {
        return function(x) {
          return _this.condition[x];
        };
      })(this))) && ((_ref = this.condition.method, __indexOf.call(presenceMethods, _ref) >= 0) || this.condition['value']);
    };

    ConditionChecker.prototype.isVisible = function() {
      var _ref;
      if (!this.isValid()) {
        return true;
      }
      if (_ref = this.condition.method, __indexOf.call(presenceMethods, _ref) >= 0) {
        return this["method_" + this.condition.method]();
      } else {
        return this.method_present() && this["method_" + this.condition.method]();
      }
    };

    return ConditionChecker;

  })();

}).call(this);

(function() {
  FormRenderer.Models.BaseFormComponent = Backbone.DeepModel.extend({
    initialize: function(_, fr, parent) {
      this.fr = fr;
      this.parent = parent;
      return this.afterInitialize();
    },
    afterInitialize: function() {},
    sync: function() {},
    shouldPersistValue: function() {
      return this.isVisible && (this.group || this.input_field);
    },
    getConditions: function() {
      return this.get('conditions') || [];
    },
    isRequired: function() {
      return this.get('required');
    },
    isConditional: function() {
      return this.getConditions().length > 0;
    },
    calculateVisibility: function() {
      var prevValue;
      prevValue = !!this.isVisible;
      this.isVisible = (!this.fr ? true : this.isConditional() ? _[this.conditionMethod()](this.getConditions(), (function(_this) {
        return function(conditionHash) {
          var conditionChecker;
          conditionChecker = new FormRenderer.ConditionChecker(_this.parent.formComponents.get(conditionHash.response_field_id), conditionHash);
          return conditionChecker.isVisible();
        };
      })(this)) : true);
      return prevValue !== this.isVisible;
    },
    conditionMethod: function() {
      if (this.get('condition_method') === 'any') {
        return 'any';
      } else {
        return 'all';
      }
    }
  });

}).call(this);

(function() {
  var _isPageButton,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  _isPageButton = function(el) {
    return el && (el.hasAttribute('data-fr-next-page') || el.hasAttribute('data-fr-previous-page'));
  };

  FormRenderer.Models.ResponseField = FormRenderer.Models.BaseFormComponent.extend({
    input_field: true,
    wrapper: 'label',
    field_type: void 0,
    validators: [],
    ignoreKeysWhenCheckingPresence: function() {
      return [];
    },
    afterInitialize: function() {
      this.errors = [];
      this.calculateVisibility();
      if (this.hasLengthValidation()) {
        return this.listenTo(this, 'change:value', this.calculateLength);
      }
    },
    getError: function() {
      if (this.errors.length > 0) {
        return this.errors.join(' ');
      }
    },
    calculateLength: function() {
      return this.set('currentLength', FormRenderer.getLength(this.getLengthValidationUnits(), this.get('value')));
    },
    getLengthValidationUnits: function() {
      return this.get('min_max_length_units') || 'characters';
    },
    setExistingValue: function(x) {
      if (x) {
        this.set('value', x);
      }
      if (this.hasLengthValidation()) {
        return this.calculateLength();
      }
    },
    getValue: function() {
      return this.get('value') || this.defaultValue();
    },
    defaultValue: function() {
      if (this.valueType === 'hash') {
        return {};
      }
    },
    toText: function() {
      return this.getValue();
    },
    hasValue: function() {
      if (this.valueType === 'hash') {
        return _.some(this.get('value') || {}, (function(_this) {
          return function(v, k) {
            return !(__indexOf.call(_this.ignoreKeysWhenCheckingPresence(), k) >= 0) && !!v;
          };
        })(this));
      } else {
        return !!this.get('value');
      }
    },
    getOptions: function() {
      return this.get('options') || [];
    },
    getColumns: function() {
      return this.get('columns') || [];
    },
    getSize: function() {
      return this.get('size') || 'small';
    },
    sizeToHeaderTag: function() {
      return {
        large: 'h2',
        medium: 'h3',
        small: 'h4'
      }[this.getSize()];
    }
  });

  FormRenderer.Views.ResponseField = Backbone.View.extend({
    className: 'fr_response_field',
    events: {
      'blur input, textarea, select': '_onBlur'
    },
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      if (this.form_renderer) {
        this.showLabels = this.form_renderer.options.showLabels;
      } else {
        this.showLabels = options.showLabels;
      }
      this.model = options.model;
      this.listenTo(this.model, 'afterValidate', this.render);
      this.listenTo(this.model, 'change', this._onInput);
      this.listenTo(this.model, 'change:currentLength', this.auditLength);
      this.listenTo(this.model, 'change:error', this.toggleErrorModifier);
      this.$el.addClass("fr_response_field_" + this.model.field_type);
      if (this.model.id) {
        return this.$el.addClass("fr_response_field_" + this.model.id);
      }
    },
    getDomId: function() {
      return this.model.cid;
    },
    reflectConditions: function() {
      if (this.model.isVisible) {
        return this.$el.show();
      } else {
        return this.$el.hide();
      }
    },
    _onBlur: function(e) {
      if (this.model.hasValue()) {
        return setTimeout((function(_this) {
          return function() {
            var newActive;
            newActive = document.activeElement;
            if (!$.contains(_this.el, newActive)) {
              if (_isPageButton(newActive)) {
                return $(document).one('mouseup', function() {
                  return _this.model.validate();
                });
              } else {
                return _this.model.validate();
              }
            }
          };
        })(this), 1);
      }
    },
    _onInput: function() {
      if (this.model.errors.length > 0) {
        return this.model.validate({
          clearOnly: true
        });
      }
    },
    focus: function() {
      return this.$el.find(':input:eq(0)').focus();
    },
    auditLength: function() {
      var $lc, validationRes;
      if (!this.model.hasLengthValidation()) {
        return;
      }
      if (!($lc = this.$el.find('.fr_length_counter'))[0]) {
        return;
      }
      validationRes = this.model.validateLength();
      if (validationRes === 'short') {
        return $lc.addClass('is_short').removeClass('is_long');
      } else if (validationRes === 'long') {
        return $lc.addClass('is_long').removeClass('is_short');
      } else {
        return $lc.removeClass('is_short is_long');
      }
    },
    toggleErrorModifier: function() {
      return this.$el[this.model.getError() ? 'addClass' : 'removeClass']('error');
    },
    partialName: function() {
      if (this.model.input_field) {
        return 'response_field';
      } else {
        return 'non_input_response_field';
      }
    },
    render: function() {
      var _ref;
      this.$el.html(JST["partials/" + (this.partialName())](this));
      rivets.bind(this.$el, {
        model: this.model
      });
      this.auditLength();
      if ((_ref = this.form_renderer) != null) {
        _ref.trigger('viewRendered', this);
      }
      return this;
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.NonInputResponseField = FormRenderer.Models.ResponseField.extend({
    input_field: false,
    validate: function() {},
    setExistingValue: function() {}
  });

}).call(this);

(function() {
  FormRenderer.Models.RepeatingGroup = FormRenderer.Models.BaseFormComponent.extend({
    group: true,
    afterInitialize: function() {
      this.calculateVisibility();
      return this.entries = [];
    },
    setExistingValue: function(entryValues) {
      if (this.isRequired() && (!entryValues || entryValues.length === 0)) {
        entryValues = [{}];
      }
      if (!this.isRequired() && _.isArray(entryValues) && _.isEmpty(entryValues)) {
        this.set('skipped', true);
      }
      if (!this.isRequired() && !entryValues) {
        entryValues = [{}];
      }
      return this.entries = _.map(entryValues, (function(_this) {
        return function(entryValue) {
          return new FormRenderer.Models.RepeatingGroupEntry({
            value: entryValue
          }, _this.fr, _this);
        };
      })(this));
    },
    addEntry: function() {
      return this.entries.push(new FormRenderer.Models.RepeatingGroupEntry({}, this.fr, this));
    },
    removeEntry: function(idx) {
      this.entries.splice(idx, 1);
      if (this.entries.length === 0) {
        return this.set('skipped', true);
      }
    },
    isSkipped: function() {
      return !!this.get('skipped');
    },
    getValue: function() {
      if (this.isSkipped()) {
        return [];
      } else {
        return _.invoke(this.entries, 'getValue');
      }
    },
    maxEntries: function() {
      if (this.get('maxentries')) {
        return parseInt(this.get('maxentries'), 10) || Infinity;
      } else {
        return Infinity;
      }
    },
    canAdd: function() {
      return this.entries.length < this.maxEntries();
    }
  });

  FormRenderer.Models.RepeatingGroupEntry = Backbone.Model.extend({
    initialize: function(_attrs, fr, repeatingGroup) {
      this.fr = fr;
      this.repeatingGroup = repeatingGroup;
      return this.initFormComponents(this.repeatingGroup.get('children'), this.get('value') || {});
    },
    reflectConditions: function() {
      return this.view.reflectConditions();
    },
    canRemove: function() {
      return this.repeatingGroup.entries.length > 1 || !this.repeatingGroup.isRequired();
    }
  });

  FormRenderer.Views.RepeatingGroup = Backbone.View.extend({
    attributes: {
      style: 'border: 1px solid gray; padding: 10px;'
    },
    className: 'fr_repeating_group',
    events: {
      'click .js-remove-entry': 'removeEntry',
      'click .js-add-entry': 'addEntry',
      'click .js-skip': 'toggleSkip'
    },
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      this.model = options.model;
      if (this.model.id) {
        return this.$el.attr('id', "fr_repeating_group_" + this.model.id);
      }
    },
    toggleSkip: function() {
      this.model.set('skipped', !this.model.isSkipped());
      if (!this.model.isSkipped() && this.model.entries.length === 0) {
        return this.addEntry();
      }
    },
    reflectConditions: function() {
      if (this.model.isVisible) {
        return this.$el.show();
      } else {
        return this.$el.hide();
      }
    },
    addEntry: function() {
      this.model.addEntry();
      return this.render();
    },
    removeEntry: function(e) {
      var idx;
      idx = this.$el.find('.js-remove-entry').index(e.target);
      this.model.removeEntry(idx);
      return this.render();
    },
    render: function() {
      var $entries, entry, idx, view, _i, _len, _ref, _ref1;
      this.$el.html(JST['partials/repeating_group'](this));
      rivets.bind(this.$el, {
        model: this.model
      });
      $entries = this.$el.find('.repeating_group_entries');
      _ref = this.model.entries;
      for (idx = _i = 0, _len = _ref.length; _i < _len; idx = ++_i) {
        entry = _ref[idx];
        view = new FormRenderer.Views.RepeatingGroupEntry({
          entry: entry,
          form_renderer: this.form_renderer,
          idx: idx
        });
        entry.view = view;
        $entries.append(view.render().el);
      }
      if ((_ref1 = this.form_renderer) != null) {
        _ref1.trigger('viewRendered', this);
      }
      return this;
    }
  });

  FormRenderer.Views.RepeatingGroupEntry = Backbone.View.extend({
    attributes: {
      style: 'border: 1px solid gray; padding: 10px; margin: 10px;'
    },
    className: 'fr_repeating_group_entry',
    initialize: function(options) {
      this.entry = options.entry;
      this.form_renderer = options.form_renderer;
      this.idx = options.idx;
      return this.views = [];
    },
    render: function() {
      var $children;
      this.$el.html(JST['partials/repeating_group_entry'](this));
      $children = this.$el.find('.repeating_group_entry_fields');
      this.entry.formComponents.each((function(_this) {
        return function(rf) {
          var view;
          view = FormRenderer.buildFormComponentView(rf, _this.form_renderer);
          $children.append(view.render().el);
          view.reflectConditions();
          return _this.views.push(view);
        };
      })(this));
      return this;
    },
    reflectConditions: function() {
      var view, _i, _len, _ref, _results;
      _ref = this.views;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        _results.push(view.reflectConditions());
      }
      return _results;
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldAddress = FormRenderer.Models.ResponseField.extend({
    wrapper: 'fieldset',
    field_type: 'address',
    valueType: 'hash',
    ignoreKeysWhenCheckingPresence: function() {
      if (this.get('address_format') === 'country') {
        return [];
      } else {
        return ['country'];
      }
    },
    setExistingValue: function(x) {
      FormRenderer.Models.ResponseField.prototype.setExistingValue.apply(this, arguments);
      if (!(x != null ? x.country : void 0)) {
        return this.set('value.country', 'US');
      }
    },
    toText: function() {
      return _.values(_.pick(this.getValue(), 'street', 'city', 'state', 'zipcode', 'country')).join(' ');
    }
  });

  FormRenderer.Views.ResponseFieldAddress = FormRenderer.Views.ResponseField.extend({
    initialize: function() {
      FormRenderer.Views.ResponseField.prototype.initialize.apply(this, arguments);
      return this.listenTo(this.model, 'change:value.country', this.render);
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldBlockOfText = FormRenderer.Models.NonInputResponseField.extend({
    field_type: 'block_of_text'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldCheckboxes = FormRenderer.Models.ResponseField.extend({
    field_type: 'checkboxes',
    wrapper: 'fieldset',
    setExistingValue: function(x) {
      var h, option, _i, _len, _ref;
      if (x == null) {
        h = {
          checked: []
        };
        _ref = this.getOptions();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          option = _ref[_i];
          if (FormRenderer.toBoolean(option.checked)) {
            h.checked.push(option.label);
          }
        }
        return this.set('value', h);
      } else {
        return FormRenderer.Models.ResponseField.prototype.setExistingValue.apply(this, arguments);
      }
    },
    toText: function() {
      var arr, _ref;
      arr = ((_ref = this.get('value.checked')) != null ? _ref.slice(0) : void 0) || [];
      if (this.get('value.other_checked') === true) {
        arr.push(this.get('value.other_text'));
      }
      return arr.join(' ');
    },
    hasValue: function() {
      var _ref;
      return ((_ref = this.get('value.checked')) != null ? _ref.length : void 0) > 0 || this.get('value.other_checked');
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldConfirm = FormRenderer.Models.ResponseField.extend({
    field_type: 'confirm',
    wrapper: 'none',
    getValue: function() {
      return this.get('value') || false;
    },
    setExistingValue: function(x) {
      return this.set('value', !!x);
    },
    toText: function() {
      if (this.get('value')) {
        return 'Yes';
      } else {
        return 'No';
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldDate = FormRenderer.Models.ResponseField.extend({
    wrapper: 'fieldset',
    field_type: 'date',
    valueType: 'hash',
    toText: function() {
      return _.values(_.pick(this.getValue(), 'month', 'day', 'year')).join('/');
    },
    validateType: function() {
      var day, daysPerMonth, febDays, maxDays, month, year;
      if (this.get('disable_year')) {
        year = 2000;
      } else {
        year = parseInt(this.get('value.year'), 10) || 0;
      }
      day = parseInt(this.get('value.day'), 10) || 0;
      month = parseInt(this.get('value.month'), 10) || 0;
      febDays = new Date(year, 1, 29).getMonth() === 1 ? 29 : 28;
      daysPerMonth = [31, febDays, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      maxDays = daysPerMonth[month - 1];
      if (!((year > 0) && ((0 < month && month <= 12)) && ((0 < day && day <= maxDays)))) {
        return 'date';
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldDropdown = FormRenderer.Models.ResponseField.extend({
    field_type: 'dropdown',
    setExistingValue: function(x) {
      var checkedOption;
      if (x != null) {
        return FormRenderer.Models.ResponseField.prototype.setExistingValue.apply(this, arguments);
      } else {
        checkedOption = _.find(this.getOptions(), function(option) {
          return FormRenderer.toBoolean(option.checked);
        });
        if (!checkedOption && !this.get('include_blank_option')) {
          checkedOption = _.first(this.getOptions());
        }
        if (checkedOption) {
          return this.set('value', checkedOption.label);
        } else {
          return this.unset('value');
        }
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldEmail = FormRenderer.Models.ResponseField.extend({
    field_type: 'email',
    validateType: function() {
      if (!this.get('value').match(FormRenderer.EMAIL_REGEX)) {
        return 'email';
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldFile = FormRenderer.Models.ResponseField.extend({
    wrapper: 'fieldset',
    field_type: 'file',
    addFile: function(id, filename) {
      var files;
      files = this.getFiles().slice(0);
      files.push({
        id: id,
        filename: filename
      });
      return this.set('value', files);
    },
    removeFile: function(idx) {
      var files;
      files = this.getFiles().slice(0);
      files.splice(idx, 1);
      return this.set('value', files);
    },
    getFiles: function() {
      return this.get('value') || [];
    },
    canAddFile: function() {
      return this.getFiles().length < this.maxFiles();
    },
    toText: function() {
      return _.compact(_.pluck(this.getFiles(), 'filename')).join(' ');
    },
    hasValue: function() {
      return _.any(this.getFiles(), function(h) {
        return !!h.id;
      });
    },
    getAcceptedExtensions: function() {
      var x;
      if ((x = FormRenderer.FILE_TYPES[this.get('file_types')])) {
        return _.map(x, function(x) {
          return "." + x;
        });
      }
    },
    getValue: function() {
      return this.getFiles();
    },
    maxFiles: function() {
      if (this.get('allow_multiple_files')) {
        return 10;
      } else {
        return 1;
      }
    }
  });

  FormRenderer.Views.ResponseFieldFile = FormRenderer.Views.ResponseField.extend({
    events: _.extend({}, FormRenderer.Views.ResponseField.prototype.events, {
      'click [data-fr-remove-file]': 'doRemove'
    }),
    render: function() {
      var uploadingFilename;
      FormRenderer.Views.ResponseField.prototype.render.apply(this, arguments);
      this.$input = this.$el.find('input');
      this.$label = this.$el.find('.fr_add_file label');
      this.$error = this.$el.find('.fr_add_file .fr_error');
      uploadingFilename = void 0;
      this.$label.on('click', function(e) {
        if ($(this).hasClass('disabled')) {
          return e.preventDefault();
        }
      });
      if (this.form_renderer) {
        this.$input.inlineFileUpload({
          method: 'post',
          action: "" + this.form_renderer.options.screendoorBase + "/api/form_renderer/file",
          ajaxOpts: {
            headers: this.form_renderer.serverHeaders
          },
          additionalParams: {
            project_id: this.form_renderer.options.project_id,
            response_field_id: this.model.get('id'),
            v: 0
          },
          start: (function(_this) {
            return function(data) {
              uploadingFilename = data.filename;
              _this.$label.addClass('disabled');
              _this.$label.text(FormRenderer.t.uploading);
              return _this.form_renderer.requests += 1;
            };
          })(this),
          progress: (function(_this) {
            return function(data) {
              return _this.$label.text(data.percent === 100 ? FormRenderer.t.finishing_up : "" + FormRenderer.t.uploading + " (" + data.percent + "%)");
            };
          })(this),
          complete: (function(_this) {
            return function() {
              return _this.form_renderer.requests -= 1;
            };
          })(this),
          success: (function(_this) {
            return function(data) {
              _this.model.addFile(data.data.file_id, uploadingFilename);
              return _this.render();
            };
          })(this),
          error: (function(_this) {
            return function(data) {
              var errorText, _ref;
              _this.render();
              errorText = (_ref = data.xhr.responseJSON) != null ? _ref.errors : void 0;
              _this.$error.text(errorText || FormRenderer.t.error).show();
              return setTimeout(function() {
                return _this.$error.hide();
              }, 2000);
            };
          })(this)
        });
      }
      return this;
    },
    doRemove: function(e) {
      var idx;
      idx = this.$el.find('[data-fr-remove-file]').index(e.target);
      this.model.removeFile(idx);
      return this.render();
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldIdentification = FormRenderer.Models.ResponseField.extend({
    field_type: 'identification',
    valueType: 'hash',
    isRequired: function() {
      return true;
    },
    validateType: function() {
      if (!this.get('value.email') || !this.get('value.name')) {
        return 'identification';
      } else if (!this.get('value.email').match(FormRenderer.EMAIL_REGEX)) {
        return 'email';
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.loadLeaflet = function(cb) {
    if ((typeof L !== "undefined" && L !== null ? L.GeoJSON : void 0) != null) {
      return cb();
    } else {
      return requireOnce(FormRenderer.MAPBOX_URL, cb);
    }
  };

  FormRenderer.initMap = function(el) {
    L.mapbox.accessToken = 'pk.eyJ1IjoiYWRhbWphY29iYmVja2VyIiwiYSI6Im1SVEQtSm8ifQ.ZgEOSXsv9eLfGQ-9yAmtIg';
    return L.mapbox.map(el, 'adamjacobbecker.ja7plkah');
  };

  FormRenderer.Models.ResponseFieldMapMarker = FormRenderer.Models.ResponseField.extend({
    field_type: 'map_marker',
    latLng: function() {
      return this.get('value');
    },
    defaultLatLng: function() {
      var lat, lng;
      if ((lat = this.get('default_lat')) && (lng = this.get('default_lng'))) {
        return [lat, lng];
      }
    }
  });

  FormRenderer.Views.ResponseFieldMapMarker = FormRenderer.Views.ResponseField.extend({
    events: _.extend({}, FormRenderer.Views.ResponseField.prototype.events, {
      'click .fr_map_cover': 'enable',
      'click [data-fr-clear-map]': 'disable'
    }),
    initialize: function() {
      FormRenderer.Views.ResponseField.prototype.initialize.apply(this, arguments);
      return this.on('shown', function() {
        var _ref;
        this.refreshing = true;
        if ((_ref = this.map) != null) {
          _ref._onResize();
        }
        return setTimeout((function(_this) {
          return function() {
            return _this.refreshing = false;
          };
        })(this), 0);
      });
    },
    render: function() {
      FormRenderer.Views.ResponseField.prototype.render.apply(this, arguments);
      this.$cover = this.$el.find('.fr_map_cover');
      FormRenderer.loadLeaflet((function(_this) {
        return function() {
          _this.initMap();
          if (_this.model.latLng()) {
            return _this.enable();
          }
        };
      })(this));
      return this;
    },
    initMap: function() {
      this.map = FormRenderer.initMap(this.$el.find('.fr_map_map')[0]);
      this.$el.find('.fr_map_map').data('map', this.map);
      this.map.setView(this.model.latLng() || this.model.defaultLatLng() || FormRenderer.DEFAULT_LAT_LNG, 13);
      this.marker = L.marker([0, 0]);
      return this.map.on('move', $.proxy(this._onMove, this));
    },
    _onMove: function() {
      var center;
      if (this.refreshing) {
        return;
      }
      center = this.map.getCenter();
      this.marker.setLatLng(center);
      this.model.set({
        value: [center.lat.toFixed(7), center.lng.toFixed(7)]
      });
      return this.model.trigger('change:value.0 change:value.1');
    },
    enable: function() {
      if (!this.map) {
        return;
      }
      this.map.addLayer(this.marker);
      this.$cover.hide();
      return this._onMove();
    },
    disable: function(e) {
      e.preventDefault();
      this.map.removeLayer(this.marker);
      this.$el.find('.fr_map_cover').show();
      return this.model.unset('value');
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldNumber = FormRenderer.Models.ResponseField.extend({
    field_type: 'number',
    validateType: function() {
      var normalized;
      normalized = FormRenderer.normalizeNumber(this.get('value'), this.get('units'));
      if (!normalized.match(/^-?\d*(\.\d+)?$/)) {
        return 'number';
      }
    }
  });

  FormRenderer.Views.ResponseFieldNumber = FormRenderer.Views.ResponseField.extend({
    calculateSize: function() {
      var digits, digitsInt;
      if ((digitsInt = parseInt(this.model.get('max'), 10))) {
        digits = ("" + digitsInt).length;
      } else {
        digits = 6;
      }
      if (!this.model.get('integer_only')) {
        digits += 2;
      }
      if (digits > 6) {
        return 'seven_plus';
      } else if (digits > 3) {
        return 'four_six';
      } else {
        return 'one_three';
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldPageBreak = FormRenderer.Models.NonInputResponseField.extend({
    field_type: 'page_break'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldParagraph = FormRenderer.Models.ResponseField.extend({
    field_type: 'paragraph'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldPhone = FormRenderer.Models.ResponseField.extend({
    field_type: 'phone',
    validateType: function() {
      var digitsOnly, isUs, minDigits, _ref;
      isUs = this.get('phone_format') === 'us';
      minDigits = isUs ? 10 : 7;
      digitsOnly = ((_ref = this.get('value').match(/\d/g)) != null ? _ref.join('') : void 0) || '';
      if (!(digitsOnly.length >= minDigits)) {
        if (isUs) {
          return 'us_phone';
        } else {
          return 'phone';
        }
      }
    }
  });

  FormRenderer.Views.ResponseFieldPhone = FormRenderer.Views.ResponseField.extend({
    phonePlaceholder: function() {
      if (this.model.get('phone_format') === 'us') {
        return '(xxx) xxx-xxxx';
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldPrice = FormRenderer.Models.ResponseField.extend({
    wrapper: 'fieldset',
    field_type: 'price',
    valueType: 'hash',
    toText: function() {
      return "" + (this.getValue().dollars || '0') + "." + (this.getValue().cents || '00');
    },
    validateType: function() {
      var values;
      values = [];
      if (this.get('value.dollars')) {
        values.push(this.get('value.dollars').replace(/,/g, '').replace(/^\$/, ''));
      }
      if (this.get('value.cents')) {
        values.push(this.get('value.cents'));
      }
      if (!_.every(values, function(x) {
        return x.match(/^-?\d+$/);
      })) {
        return 'price';
      }
    }
  });

  FormRenderer.Views.ResponseFieldPrice = FormRenderer.Views.ResponseField.extend({
    events: _.extend({}, FormRenderer.Views.ResponseField.prototype.events, {
      'blur [data-rv-input="model.value.cents"]': 'formatCents'
    }),
    formatCents: function(e) {
      var cents;
      cents = $(e.target).val();
      if (cents && cents.match(/^\d$/)) {
        return this.model.set('value.cents', "0" + cents);
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldRadio = FormRenderer.Models.ResponseFieldCheckboxes.extend({
    field_type: 'radio',
    wrapper: 'fieldset'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldSectionBreak = FormRenderer.Models.NonInputResponseField.extend({
    field_type: 'section_break'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldTable = FormRenderer.Models.ResponseField.extend({
    field_type: 'table',
    initialize: function() {
      FormRenderer.Models.ResponseField.prototype.initialize.apply(this, arguments);
      if (this.get('column_totals')) {
        return this.listenTo(this, 'change:value.*', this.calculateColumnTotals);
      }
    },
    canAddRows: function() {
      return this.numRows < this.maxRows();
    },
    minRows: function() {
      return parseInt(this.get('minrows'), 10) || 0;
    },
    maxRows: function() {
      if (this.get('maxrows')) {
        return parseInt(this.get('maxrows'), 10) || Infinity;
      } else {
        return Infinity;
      }
    },
    setExistingValue: function(x) {
      var firstColumnLength, _ref;
      firstColumnLength = ((_ref = _.find(x, (function() {
        return true;
      }))) != null ? _ref.length : void 0) || 0;
      this.numRows = Math.max(this.minRows(), firstColumnLength, 1);
      return this.set('value', _.tap([], (function(_this) {
        return function(arr) {
          var colArr, column, i, _i, _j, _len, _ref1, _ref2, _ref3, _results;
          _ref1 = _this.getColumns();
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            column = _ref1[_i];
            colArr = [];
            for (i = _j = 0, _ref2 = _this.numRows - 1; 0 <= _ref2 ? _j <= _ref2 : _j >= _ref2; i = 0 <= _ref2 ? ++_j : --_j) {
              colArr.push(_this.getPresetValue(column.label, i) || (x != null ? (_ref3 = x[column.label]) != null ? _ref3[i] : void 0 : void 0));
            }
            _results.push(arr.push(colArr));
          }
          return _results;
        };
      })(this)));
    },
    hasValue: function() {
      return _.some(this.getValue(), (function(_this) {
        return function(colVals, colLabel) {
          return _.some(colVals, function(v, idx) {
            return !_this.getPresetValue(colLabel, idx) && !!v;
          });
        };
      })(this));
    },
    getPresetValue: function(columnLabel, row) {
      var _ref, _ref1;
      return (_ref = this.get('preset_values')) != null ? (_ref1 = _ref[columnLabel]) != null ? _ref1[row] : void 0 : void 0;
    },
    getValue: function() {
      return _.tap({}, (function(_this) {
        return function(h) {
          var column, i, j, _i, _len, _ref, _results;
          _ref = _this.getColumns();
          _results = [];
          for (j = _i = 0, _len = _ref.length; _i < _len; j = ++_i) {
            column = _ref[j];
            h[column.label] = [];
            _results.push((function() {
              var _j, _ref1, _results1;
              _results1 = [];
              for (i = _j = 0, _ref1 = this.numRows - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
                _results1.push(h[column.label].push(this.get("value." + j + "." + i) || ''));
              }
              return _results1;
            }).call(_this));
          }
          return _results;
        };
      })(this));
    },
    toText: function() {
      return _.flatten(_.values(this.getValue())).join(' ');
    },
    calculateColumnTotals: function() {
      var column, columnSum, columnVals, i, j, _i, _j, _len, _ref, _ref1, _results;
      _ref = this.getColumns();
      _results = [];
      for (j = _i = 0, _len = _ref.length; _i < _len; j = ++_i) {
        column = _ref[j];
        columnVals = [];
        for (i = _j = 0, _ref1 = this.numRows - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
          columnVals.push(parseFloat((this.get("value." + j + "." + i) || '').replace(/\$?,?/g, '')));
        }
        columnSum = _.reduce(columnVals, function(memo, num) {
          if (_.isNaN(num)) {
            return memo;
          } else {
            return memo + num;
          }
        }, 0);
        _results.push(this.set("columnTotals." + j, this.formatColumnSum(columnSum)));
      }
      return _results;
    },
    formatColumnSum: function(num) {
      var parsed, precision, _ref;
      if (num > 0) {
        parsed = parseFloat(num.toFixed(10));
        precision = ((_ref = ("" + parsed).split('.')[1]) != null ? _ref.length : void 0) || 0;
        return _str.numberFormat(parsed, precision, '.', ',');
      } else {
        return '';
      }
    }
  });

  FormRenderer.Views.ResponseFieldTable = FormRenderer.Views.ResponseField.extend({
    events: _.extend({}, FormRenderer.Views.ResponseField.prototype.events, {
      'click .js-add-row': 'addRow',
      'click .js-remove-row': 'removeRow'
    }),
    canRemoveRow: function(rowIdx) {
      var min;
      min = Math.max(1, this.model.minRows());
      return rowIdx > (min - 1);
    },
    addRow: function(e) {
      e.preventDefault();
      this.model.numRows++;
      return this.render();
    },
    removeRow: function(e) {
      var col, idx, modelVal, newVal, vals;
      e.preventDefault();
      idx = $(e.currentTarget).closest('[data-row-index]').data('row-index');
      modelVal = this.model.get('value');
      newVal = {};
      for (col in modelVal) {
        vals = modelVal[col];
        newVal[col] = _.tap({}, function(h) {
          var i, val, _results;
          _results = [];
          for (i in vals) {
            val = vals[i];
            i = parseInt(i, 10);
            if (i < idx) {
              _results.push(h[i] = val);
            } else if (i > idx) {
              _results.push(h[i - 1] = val);
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        });
      }
      this.model.numRows--;
      this.model.attributes.value = newVal;
      this.model.trigger('change change:value', this.model);
      return this.render();
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldText = FormRenderer.Models.ResponseField.extend({
    field_type: 'text'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldTime = FormRenderer.Models.ResponseField.extend({
    field_type: 'time',
    wrapper: 'fieldset',
    valueType: 'hash',
    ignoreKeysWhenCheckingPresence: function() {
      return ['am_pm'];
    },
    setExistingValue: function(x) {
      FormRenderer.Models.ResponseField.prototype.setExistingValue.apply(this, arguments);
      if (!(x != null ? x.am_pm : void 0)) {
        return this.set('value.am_pm', 'AM');
      }
    },
    toText: function() {
      return "" + (this.getValue().hours || '00') + ":" + (this.getValue().minutes || '00') + ":" + (this.getValue().seconds || '00') + " " + (this.getValue().am_pm);
    },
    validateType: function() {
      var hours, minutes, seconds;
      hours = parseInt(this.get('value.hours'), 10) || 0;
      minutes = parseInt(this.get('value.minutes'), 10) || 0;
      seconds = parseInt(this.get('value.seconds'), 10) || 0;
      if (!(((1 <= hours && hours <= 12)) && ((0 <= minutes && minutes <= 59)) && ((0 <= seconds && seconds <= 59)))) {
        return 'time';
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldWebsite = FormRenderer.Models.ResponseField.extend({
    field_type: 'website'
  });

}).call(this);

(function() {
  var FieldValidation;

  FieldValidation = {
    validateType: function() {},
    validationFns: ['validateType', 'validateInteger', 'validateLength', 'validateMinMax'],
    validate: function(opts) {
      var errorIs, errorKey, errorWas, validationFn, _i, _len, _ref;
      if (opts == null) {
        opts = {};
      }
      errorWas = this.get('error');
      this.errors = [];
      if (!this.isVisible) {
        return;
      }
      if (!this.hasValue()) {
        if (this.isRequired()) {
          this.errors.push(FormRenderer.t.errors.blank);
        }
      } else {
        _ref = this.validationFns;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          validationFn = _ref[_i];
          errorKey = this[validationFn]();
          if (errorKey) {
            this.errors.push(FormRenderer.t.errors[errorKey]);
          }
        }
      }
      errorIs = this.getError();
      if (opts.clearOnly && errorWas !== errorIs) {
        this.set('error', null);
      } else {
        this.set('error', this.getError());
      }
      return this.fr.trigger('afterValidate afterValidate:one', this);
    },
    hasIntegerValidation: function() {
      return this.field_type === 'number' && this.get('integer_only');
    },
    validateInteger: function() {
      var normalized;
      if (!this.hasIntegerValidation()) {
        return;
      }
      normalized = FormRenderer.normalizeNumber(this.get('value'), this.get('units'));
      if (!normalized.match(/^-?\d+$/)) {
        return 'integer';
      }
    },
    hasLengthValidation: function() {
      var _ref;
      return ((_ref = this.field_type) === 'text' || _ref === 'paragraph') && (this.get('minlength') || this.get('maxlength'));
    },
    validateLength: function() {
      var count, max, min;
      if (!this.hasLengthValidation()) {
        return;
      }
      min = parseInt(this.get('minlength'), 10) || void 0;
      max = parseInt(this.get('maxlength'), 10) || void 0;
      count = FormRenderer.getLength(this.getLengthValidationUnits(), this.get('value'));
      if (min && count < min) {
        return 'short';
      } else if (max && count > max) {
        return 'long';
      }
    },
    hasMinMaxValidation: function() {
      var _ref;
      return ((_ref = this.field_type) === 'number' || _ref === 'price') && (this.get('min') || this.get('max'));
    },
    validateMinMax: function() {
      var max, min, value;
      if (!this.hasMinMaxValidation()) {
        return;
      }
      min = this.get('min') && parseFloat(this.get('min'));
      max = this.get('max') && parseFloat(this.get('max'));
      value = this.field_type === 'price' ? parseFloat("" + (this.get('value.dollars') || 0) + "." + (this.get('value.cents') || 0)) : parseFloat(this.get('value').replace(/,/g, ''));
      if (min && value < min) {
        return 'small';
      } else if (max && value > max) {
        return 'large';
      }
    }
  };

  _.extend(FormRenderer.Models.ResponseField.prototype, FieldValidation);

}).call(this);

(function() {
  var HasComponents;

  HasComponents = {
    getValue: function() {
      return _.tap({}, (function(_this) {
        return function(h) {
          return _this.formComponents.each(function(c) {
            if (c.shouldPersistValue()) {
              return h[c.get('id')] = c.getValue();
            }
          });
        };
      })(this));
    },
    initFormComponents: function(fieldData, responseData) {
      var field, klass, model, _i, _len;
      this.formComponents = new Backbone.Collection;
      for (_i = 0, _len = fieldData.length; _i < _len; _i++) {
        field = fieldData[_i];
        klass = field.type === 'group' ? FormRenderer.Models.RepeatingGroup : FormRenderer.Models["ResponseField" + (_str.classify(field.field_type))];
        model = new klass(field, this.fr, this);
        model.setExistingValue(responseData[model.get('id')]);
        this.formComponents.add(model);
      }
      this.initConditions();
      return this.listenTo(this.formComponents, 'change:value change:value.*', function(rf) {
        this.runConditions(rf);
        return this.fr.responsesChanged();
      });
    },
    initConditions: function() {
      return this.allConditions = _.flatten(this.formComponents.map(function(rf) {
        return _.map(rf.getConditions(), function(c) {
          return _.extend({}, c, {
            parent: rf
          });
        });
      }));
    },
    conditionsForResponseField: function(rf) {
      return _.filter(this.allConditions, function(condition) {
        return ("" + condition.response_field_id) === ("" + rf.id);
      });
    },
    runConditions: function(rf) {
      var needsRender;
      needsRender = false;
      _.each(this.conditionsForResponseField(rf), function(c) {
        if (c.parent.calculateVisibility()) {
          return needsRender = true;
        }
      });
      if (needsRender) {
        return this.reflectConditions();
      }
    }
  };

  _.extend(FormRenderer.prototype, HasComponents);

  _.extend(FormRenderer.Models.RepeatingGroupEntry.prototype, HasComponents);

}).call(this);

(function() {
  FormRenderer.Plugins.Base = (function() {
    function Base(fr) {
      this.fr = fr;
    }

    return Base;

  })();

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Plugins.Autosave = (function(_super) {
    __extends(Autosave, _super);

    function Autosave() {
      return Autosave.__super__.constructor.apply(this, arguments);
    }

    Autosave.prototype.afterFormLoad = function() {
      return setInterval((function(_this) {
        return function() {
          if (_this.fr.state.get('hasChanges')) {
            return _this.fr.save();
          }
        };
      })(this), 5000);
    };

    return Autosave;

  })(FormRenderer.Plugins.Base);

}).call(this);

(function() {
  var getUrlParam, paramName,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  paramName = 'frDraft';

  getUrlParam = function(name) {
    var regex, results, url;
    url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    results = regex.exec(url);
    if (!results) {
      return null;
    }
    if (!results[2]) {
      return '';
    }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  };

  FormRenderer.Plugins.BookmarkDraft = (function(_super) {
    __extends(BookmarkDraft, _super);

    function BookmarkDraft() {
      return BookmarkDraft.__super__.constructor.apply(this, arguments);
    }

    BookmarkDraft.prototype.beforeFormLoad = function() {
      var id;
      if ((id = getUrlParam(paramName))) {
        return this.fr.options.response.id = id;
      }
    };

    BookmarkDraft.prototype.afterFormLoad = function() {
      this.fr.subviews.bookmarkDraft = new FormRenderer.Plugins.BookmarkDraft.View({
        form_renderer: this.fr
      });
      return this.fr.$el.append(this.fr.subviews.bookmarkDraft.render().el);
    };

    return BookmarkDraft;

  })(FormRenderer.Plugins.Base);

  FormRenderer.Plugins.BookmarkDraft.View = Backbone.View.extend({
    events: {
      'click .js-fr-bookmark': 'requestBookmark'
    },
    initialize: function(options) {
      return this.form_renderer = options.form_renderer;
    },
    render: function() {
      this.$el.html(JST['plugins/bookmark_draft'](this));
      this.form_renderer.trigger('viewRendered', this);
      return this;
    },
    showBookmark: function(url) {
      return prompt(FormRenderer.t.bookmark_hint, url);
    },
    getUrl: function() {
      var u;
      u = new Url;
      u.query[paramName] = this.form_renderer.options.response.id;
      return u.toString();
    },
    requestBookmark: function(e) {
      var cb;
      e.preventDefault();
      cb = (function(_this) {
        return function() {
          _this.render();
          return _this.showBookmark(_this.getUrl());
        };
      })(this);
      if (this.form_renderer.options.response.id) {
        return cb();
      } else {
        this.$el.find('a').text(FormRenderer.t.saving);
        return this.form_renderer.waitForRequests((function(_this) {
          return function() {
            if (_this.form_renderer.options.response.id) {
              return cb();
            } else {
              return _this.form_renderer.save({
                cb: cb
              });
            }
          };
        })(this));
      }
    }
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Plugins.BottomBar = (function(_super) {
    __extends(BottomBar, _super);

    function BottomBar() {
      return BottomBar.__super__.constructor.apply(this, arguments);
    }

    BottomBar.prototype.afterFormLoad = function() {
      this.fr.subviews.bottomBar = new FormRenderer.Plugins.BottomBar.View({
        form_renderer: this.fr
      });
      return this.fr.$el.append(this.fr.subviews.bottomBar.render().el);
    };

    return BottomBar;

  })(FormRenderer.Plugins.Base);

  FormRenderer.Plugins.BottomBar.View = Backbone.View.extend({
    events: {
      'click [data-fr-previous-page]': function(e) {
        e.preventDefault();
        return this.form_renderer.handlePreviousPage();
      },
      'click [data-fr-next-page]': function(e) {
        e.preventDefault();
        return this.form_renderer.handleNextPage();
      }
    },
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      return this.listenTo(this.form_renderer.state, 'change:activePage change:hasChanges change:submitting change:hasServerErrors', this.render);
    },
    render: function() {
      this.$el.html(JST['plugins/bottom_bar'](this));
      this.form_renderer.trigger('viewRendered', this);
      return this;
    }
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Plugins.ErrorBar = (function(_super) {
    __extends(ErrorBar, _super);

    function ErrorBar() {
      return ErrorBar.__super__.constructor.apply(this, arguments);
    }

    ErrorBar.prototype.afterFormLoad = function() {
      this.fr.subviews.errorBar = new FormRenderer.Plugins.ErrorBar.View({
        form_renderer: this.fr
      });
      return this.fr.$el.prepend(this.fr.subviews.errorBar.render().el);
    };

    return ErrorBar;

  })(FormRenderer.Plugins.Base);

  FormRenderer.Plugins.ErrorBar.View = Backbone.View.extend({
    events: {
      'click a': function(e) {
        e.preventDefault();
        return this.form_renderer.focusFirstError();
      }
    },
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      this.listenTo(this.form_renderer, 'afterValidate:all', (function(_this) {
        return function() {
          _this.render();
          return _this.$el.find('.fr_error_alert_bar a').focus();
        };
      })(this));
      return this.listenTo(this.form_renderer, 'afterValidate:one', function() {
        if (this.form_renderer.areAllPagesValid()) {
          return this.render();
        }
      });
    },
    render: function() {
      this.$el.html(JST['plugins/error_bar'](this));
      this.form_renderer.trigger('viewRendered', this);
      if (!this.form_renderer.areAllPagesValid()) {
        window.scrollTo(0, this.$el.offset().top - this.form_renderer.options.scrollToPadding);
      }
      return this;
    }
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Plugins.PageState = (function(_super) {
    __extends(PageState, _super);

    function PageState() {
      return PageState.__super__.constructor.apply(this, arguments);
    }

    PageState.prototype.afterFormLoad = function() {
      var num, page, _ref;
      if (num = (_ref = window.location.hash.match(/page([0-9]+)/)) != null ? _ref[1] : void 0) {
        page = parseInt(num, 10);
        if (this.fr.isPageVisible(page)) {
          this.fr.activatePage(page);
        }
      }
      return this.fr.state.on('change:activePage', function(_, num) {
        return window.location.hash = "page" + num;
      });
    };

    return PageState;

  })(FormRenderer.Plugins.Base);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Plugins.SavedSession = (function(_super) {
    __extends(SavedSession, _super);

    function SavedSession() {
      return SavedSession.__super__.constructor.apply(this, arguments);
    }

    SavedSession.prototype.beforeFormLoad = function() {
      var draftKey, _base;
      draftKey = "project-" + this.fr.options.project_id + "-response-id";
      (_base = this.fr.options.response).id || (_base.id = Cookies.get(draftKey));
      this.fr.on('afterSave', function() {
        if (!this.state.get('submitting')) {
          return Cookies.set(draftKey, this.options.response.id);
        }
      });
      this.fr.on('afterSubmit', function() {
        return Cookies.remove(draftKey);
      });
      return this.fr.on('errorSaving', function() {
        return Cookies.remove(draftKey);
      });
    };

    return SavedSession;

  })(FormRenderer.Plugins.Base);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Plugins.WarnBeforeUnload = (function(_super) {
    __extends(WarnBeforeUnload, _super);

    function WarnBeforeUnload() {
      return WarnBeforeUnload.__super__.constructor.apply(this, arguments);
    }

    WarnBeforeUnload.prototype.afterFormLoad = function() {
      return BeforeUnload.enable({
        "if": (function(_this) {
          return function() {
            return _this.fr.state.get('hasChanges');
          };
        })(this)
      });
    };

    return WarnBeforeUnload;

  })(FormRenderer.Plugins.Base);

}).call(this);

(function() {
  FormRenderer.Views.Page = Backbone.View.extend({
    className: 'fr_page',
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      this.models = [];
      return this.views = [];
    },
    render: function() {
      var rf, view, _i, _len, _ref;
      this.hide();
      _ref = this.models;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        rf = _ref[_i];
        view = FormRenderer.buildFormComponentView(rf, this.form_renderer);
        this.$el.append(view.render().el);
        view.reflectConditions();
        this.views.push(view);
      }
      return this;
    },
    hide: function() {
      var view, _i, _len, _ref, _results;
      this.$el.hide();
      _ref = this.views;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        _results.push(view.trigger('hidden'));
      }
      return _results;
    },
    show: function() {
      var view, _i, _len, _ref, _results;
      this.$el.show();
      _ref = this.views;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        _results.push(view.trigger('shown'));
      }
      return _results;
    },
    reflectConditions: function() {
      var view, _i, _len, _ref, _results;
      _ref = this.views;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        _results.push(view.reflectConditions());
      }
      return _results;
    },
    validate: function() {
      var entry, rf, _i, _len, _ref, _results;
      _ref = this.models;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        rf = _ref[_i];
        if (rf.input_field) {
          rf.validate();
        }
        if (rf.group) {
          _results.push((function() {
            var _j, _len1, _ref1, _results1;
            _ref1 = rf.entries;
            _results1 = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              entry = _ref1[_j];
              _results1.push(entry.formComponents.each((function(_this) {
                return function(component) {
                  return component.validate();
                };
              })(this)));
            }
            return _results1;
          }).call(this));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    firstViewWithError: function() {
      var entry, fieldView, view, _, _ref, _ref1, _ref2;
      _ref = this.views;
      for (_ in _ref) {
        view = _ref[_];
        if (view.model.group) {
          if (!view.model.isSkipped()) {
            _ref1 = view.model.entries;
            for (_ in _ref1) {
              entry = _ref1[_];
              _ref2 = entry.view.views;
              for (_ in _ref2) {
                fieldView = _ref2[_];
                if (fieldView.model.errors.length > 0) {
                  return fieldView;
                }
              }
            }
          }
        } else {
          if (view.model.errors.length > 0) {
            return view;
          }
        }
      }
      return void 0;
    },
    isVisible: function() {
      return !!_.find(this.models, (function(rf) {
        return rf.isVisible;
      }));
    },
    isValid: function() {
      return !this.firstViewWithError();
    }
  });

}).call(this);

(function() {
  FormRenderer.Views.Pagination = Backbone.View.extend({
    events: {
      'click [data-activate-page]': function(e) {
        e.preventDefault();
        return this.form_renderer.activatePage($(e.currentTarget).data('activate-page'));
      }
    },
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      this.listenTo(this.form_renderer.state, 'change:activePage', this.render);
      return this.listenTo(this.form_renderer, 'afterValidate', this.render);
    },
    render: function() {
      this.$el.html(JST['partials/pagination'](this));
      this.form_renderer.trigger('viewRendered', this);
      return this;
    }
  });

}).call(this);

FormRenderer.FILE_TYPES = {
  "images": ["bmp", "gif", "jpg", "jpeg", "png", "psd", "tif", "tiff"],
  "videos": ["m4v", "mp4", "mov", "mpg"],
  "audio": ["m4a", "mp3", "wav"],
  "docs": ["doc", "docx", "pdf", "rtf", "txt"],
  "spreadsheets": ["csv", "xls", "xlsx"],
  "presentations": ["ppt", "pptx"],
  "pdfs": ["pdf"]
}
;
var FormRendererEN = {"address":"Address","add_another_row":"Add another row","back_to_page":"Back to page :num","blind":"Blind","bookmark_hint":"To finish your response later, copy the link below.","cents":"Cents","characters":"characters","city":"City","clear":"Clear","click_to_set":"Click to set location","coordinates":"Coordinates","country":"Country","dollars":"Dollars","email":"Email","enter_at_least":"Enter at least :min","enter_between":"Enter between :min and :max","enter_exactly":"Enter :num","enter_up_to":"Enter up to :max","error":"Error","errors":{"blank":"This field can't be blank.","date":"Please enter a valid date.","email":"Please enter a valid email address.","identification":"Please enter your name and email address.","integer":"Please enter a whole number.","large":"Your answer is too large.","long":"Your answer is too long.","number":"Please enter a valid number.","phone":"Please enter a valid phone number.","price":"Please enter a valid price.","short":"Your answer is too short.","small":"Your answer is too small.","time":"Please enter a valid time.","us_phone":"Please enter a valid 10-digit phone number."},"error_bar":{"errors":"Your response has <a href='#'>validation errors</a>."},"error_filename":"Error reading filename","error_loading":"Error loading form","error_saving":"Error saving","finishing_up":"Finishing up...","finish_later":"Finish this later","hidden":"Hidden","hidden_until_rules_met":"Hidden until rules are met","loading_form":"Loading form...","na":"N/A","name":"Name","next_page":"Next page","not_supported":"Sorry, your browser does not support this embedded form. Please visit <a href=':url?fr_not_supported=t'>:url</a> to fill out this form.","other":"Other","postal_code":"Postal Code","province":"Province","remove":"Remove","saved":"Saved","saving":"Saving...","state":"State","state_province_region":"State / Province / Region","submit":"Submit","submitting":"Submitting","thanks":"Thanks for submitting our form!","upload":"Upload a file","uploading":"Uploading...","upload_another":"Upload another file","we_accept":"We'll accept","words":"words","write_here":"Write your answer here","zip_code":"ZIP Code"};
if (typeof FormRenderer !== 'undefined') FormRenderer.t = FormRendererEN;
if (!window.JST) {
  window.JST = {};
}
window.JST["fields/address"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var format, x, _i, _j, _len, _len1, _ref, _ref1, _ref2;
    
      format = this.model.get('address_format');
    
      _print(_safe('\n\n'));
    
      if (format !== 'city_state' && format !== 'city_state_zip' && format !== 'country') {
        _print(_safe('\n  <div class=\'fr_grid\'>\n    <div class=\'fr_full has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.getDomId());
        _print(_safe('_street\'>'));
        _print(FormRenderer.t.address);
        _print(_safe('</label>\n      <input type="text"\n             id="'));
        _print(this.getDomId());
        _print(_safe('_street"\n             data-rv-input=\'model.value.street\' />\n    </div>\n  </div>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (format !== 'country') {
        _print(_safe('\n  <div class=\'fr_grid\'>\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.getDomId());
        _print(_safe('_city\'>'));
        _print(FormRenderer.t.city);
        _print(_safe('</label>\n      <input type="text"\n             data-rv-input=\'model.value.city\'\n             id=\''));
        _print(this.getDomId());
        _print(_safe('_city\' />\n    </div>\n\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.getDomId());
        _print(_safe('_state\'>\n        '));
        if (this.model.get('value.country') === 'US') {
          _print(_safe('\n          '));
          _print(FormRenderer.t.state);
          _print(_safe('\n        '));
        } else if (this.model.get('value.country') === 'CA') {
          _print(_safe('\n          '));
          _print(FormRenderer.t.province);
          _print(_safe('\n        '));
        } else {
          _print(_safe('\n          '));
          _print(FormRenderer.t.state_province_region);
          _print(_safe('\n        '));
        }
        _print(_safe('\n      </label>\n\n      '));
        if ((_ref = this.model.get('value.country')) === 'US' || _ref === 'CA') {
          _print(_safe('\n        <select data-rv-value=\'model.value.state\' data-width=\'100%\' id=\''));
          _print(this.getDomId());
          _print(_safe('_state\'>\n          <option></option>\n          '));
          _ref1 = FormRenderer["PROVINCES_" + (this.model.get('value.country'))];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            x = _ref1[_i];
            _print(_safe('\n            <option value=\''));
            _print(x);
            _print(_safe('\'>'));
            _print(x);
            _print(_safe('</option>\n          '));
          }
          _print(_safe('\n        </select>\n      '));
        } else {
          _print(_safe('\n        <input type="text" data-rv-input=\'model.value.state\' id=\''));
          _print(this.getDomId());
          _print(_safe('_state\' />\n      '));
        }
        _print(_safe('\n    </div>\n  </div>\n'));
      }
    
      _print(_safe('\n\n<div class=\'fr_grid\'>\n  '));
    
      if (format !== 'city_state' && format !== 'country') {
        _print(_safe('\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.getDomId());
        _print(_safe('_zipcode\'>\n        '));
        if (this.model.get('value.country') === 'US') {
          _print(_safe('\n          '));
          _print(FormRenderer.t.zip_code);
          _print(_safe('\n        '));
        } else {
          _print(_safe('\n          '));
          _print(FormRenderer.t.postal_code);
          _print(_safe('\n        '));
        }
        _print(_safe('\n      </label>\n      <input type="text"\n             data-rv-input=\'model.value.zipcode\'\n             id=\''));
        _print(this.getDomId());
        _print(_safe('_zipcode\' />\n    </div>\n  '));
      }
    
      _print(_safe('\n\n  '));
    
      if (format !== 'city_state' && format !== 'city_state_zip') {
        _print(_safe('\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.getDomId());
        _print(_safe('_country\'>'));
        _print(FormRenderer.t.country);
        _print(_safe('</label>\n      <select data-rv-value=\'model.value.country\' data-width=\'100%\' id=\''));
        _print(this.getDomId());
        _print(_safe('_country\'>\n        '));
        _ref2 = FormRenderer.ORDERED_COUNTRIES;
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          x = _ref2[_j];
          _print(_safe('\n          <option value=\''));
          _print(x);
          _print(_safe('\'>'));
          _print(ISOCountryNames[x] || '---');
          _print(_safe('</option>\n        '));
        }
        _print(_safe('\n      </select>\n    </div>\n  '));
      }
    
      _print(_safe('\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/block_of_text"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe(JST["partials/labels"](this)));
    
      _print(_safe('\n\n<div class=\'fr_text size_'));
    
      _print(this.model.getSize());
    
      _print(_safe('\'>\n  '));
    
      _print(_safe(FormRenderer.formatHTML(this.model.get('description'))));
    
      _print(_safe('\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/checkboxes"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe(JST["partials/options_field"](this)));
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/confirm"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<label class=\'fr_option control\'>\n  <input type=\'checkbox\' data-rv-checked=\'model.value\' />\n  '));
    
      _print(this.model.get('label'));
    
      _print(_safe(JST["partials/required"](this)));
    
      _print(_safe('\n</label>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/date"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_grid\'>\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="'));
    
      _print(this.getDomId());
    
      _print(_safe('_month">MM</label>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('_month"\n           data-rv-input=\'model.value.month\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_spacer\'>/</div>\n\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="'));
    
      _print(this.getDomId());
    
      _print(_safe('_day">DD</label>\n    <input type="text"\n           data-rv-input=\'model.value.day\'\n           maxlength=\'2\'\n           size=\'2\'\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('_day" />\n  </div>\n\n  '));
    
      if (!this.model.get('disable_year')) {
        _print(_safe('\n    <div class=\'fr_spacer\'>/</div>\n\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="'));
        _print(this.getDomId());
        _print(_safe('_year">YYYY</label>\n      <input type="text"\n             data-rv-input=\'model.value.year\'\n             maxlength=\'4\'\n             size=\'4\'\n             id="'));
        _print(this.getDomId());
        _print(_safe('_year" />\n    </div>\n  '));
      }
    
      _print(_safe('\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/dropdown"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var option, _i, _len, _ref;
    
      _print(_safe('<select id="'));
    
      _print(this.getDomId());
    
      _print(_safe('" data-rv-value=\'model.value\'>\n  '));
    
      if (this.model.get('include_blank_option')) {
        _print(_safe('\n    <option></option>\n  '));
      }
    
      _print(_safe('\n\n  '));
    
      _ref = this.model.getOptions();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        _print(_safe('\n    <option value="'));
        _print(option.label);
        _print(_safe('">\n      '));
        _print(option.translated_label || option.label);
        _print(_safe('\n    </option>\n  '));
      }
    
      _print(_safe('\n</select>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/email"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<input type="text" inputmode="email"\n       id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n       data-rv-input=\'model.value\' />\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/file"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var attachment, exts, _i, _len, _ref;
    
      _print(_safe('<div class=\'fr_files\'>\n  '));
    
      _ref = this.model.getFiles();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        attachment = _ref[_i];
        _print(_safe('\n    <div class=\'fr_file\'>\n      <span>'));
        _print(attachment.filename);
        _print(_safe('</span>\n      <button data-fr-remove-file class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>'));
        _print(FormRenderer.t.remove);
        _print(_safe('</button>\n    </div>\n  '));
      }
    
      _print(_safe('\n</div>\n\n'));
    
      if (this.model.canAddFile()) {
        _print(_safe('\n  <div class=\'fr_add_file\'>\n    <label for=\''));
        _print(this.getDomId());
        _print(_safe('\' class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>\n      '));
        _print(this.model.getFiles().length ? FormRenderer.t.upload_another : FormRenderer.t.upload);
        _print(_safe('\n    </label>\n\n    <input type=\'file\'\n           id=\''));
        _print(this.getDomId());
        _print(_safe('\'\n           '));
        if ((exts = this.model.getAcceptedExtensions())) {
          _print(_safe('\n            accept=\''));
          _print(exts.join(','));
          _print(_safe('\'\n           '));
        }
        _print(_safe('\n           />\n\n    <span class=\'fr_error\' style=\'display:none\'></span>\n\n    '));
        if ((exts = this.model.getAcceptedExtensions())) {
          _print(_safe('\n      <div class=\'fr_description\'>\n        '));
          _print(FormRenderer.t.we_accept);
          _print(_safe(' '));
          _print(_str.toSentence(exts));
          _print(_safe('\n      </div>\n    '));
        }
        _print(_safe('\n  </div>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/identification"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_grid\'>\n  <div class=\'fr_half\'>\n    <label for=\''));
    
      _print(this.getDomId());
    
      _print(_safe('-name\'>'));
    
      _print(FormRenderer.t.name);
    
      _print(_safe(' <abbr class=\'fr_required\' title=\'required\'>*</abbr></label>\n    <input type=\'text\'\n           id=\''));
    
      _print(this.getDomId());
    
      _print(_safe('-name\'\n           data-rv-input=\'model.value.name\' />\n  </div>\n\n  <div class=\'fr_half\'>\n    <label for=\''));
    
      _print(this.getDomId());
    
      _print(_safe('-email\'>'));
    
      _print(FormRenderer.t.email);
    
      _print(_safe(' <abbr class=\'fr_required\' title=\'required\'>*</abbr></label>\n    <input type="text"\n           id=\''));
    
      _print(this.getDomId());
    
      _print(_safe('-email\'\n           data-rv-input=\'model.value.email\' />\n  </div>\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/map_marker"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_map_wrapper\'>\n  <div class=\'fr_map_map\' />\n\n  <div class=\'fr_map_cover\'>\n    '));
    
      _print(FormRenderer.t.click_to_set);
    
      _print(_safe('\n  </div>\n\n  <div class=\'fr_map_toolbar\'>\n    <div class=\'fr_map_coord\'>\n      <strong>'));
    
      _print(FormRenderer.t.coordinates);
    
      _print(_safe(':</strong>\n      <span data-rv-show=\'model.value\'>\n        <span data-rv-text=\'model.value.0\' />,\n        <span data-rv-text=\'model.value.1\' />\n      </span>\n      <span data-rv-hide=\'model.value\' class=\'fr_map_no_location\'>'));
    
      _print(FormRenderer.t.na);
    
      _print(_safe('</span>\n    </div>\n    <a class=\'fr_map_clear\' data-fr-clear-map data-rv-show=\'model.value\' href=\'#\'>'));
    
      _print(FormRenderer.t.clear);
    
      _print(_safe('</a>\n  </div>\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/number"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<input type="text"\n       id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n       data-rv-input=\'model.value\'\n       class="size_'));
    
      _print(this.calculateSize());
    
      _print(_safe('" />\n\n'));
    
      if (this.model.get('units')) {
        _print(_safe('\n  <span class=\'fr_units\'>\n    '));
        _print(this.model.get('units'));
        _print(_safe('\n  </span>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/page_break"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_page_break_inner\'>\n  Page break\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/paragraph"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<textarea\n   id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n   class="size_'));
    
      _print(this.model.getSize());
    
      _print(_safe('"\n   data-rv-input=\'model.value\' />\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/phone"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<input type="text"\n       inputmode="tel"\n       id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n       data-rv-input=\'model.value\'\n       placeholder="'));
    
      _print(this.phonePlaceholder());
    
      _print(_safe('" />\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/price"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_grid\'>\n  <div class=\'fr_spacer\'>$</div>\n\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="'));
    
      _print(this.getDomId());
    
      _print(_safe('_dollars">'));
    
      _print(FormRenderer.t.dollars);
    
      _print(_safe('</label>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('_dollars"\n           data-rv-input=\'model.value.dollars\'\n           size=\'6\' />\n  </div>\n\n  '));
    
      if (!this.model.get('disable_cents')) {
        _print(_safe('\n    <div class=\'fr_spacer\'>.</div>\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="'));
        _print(this.getDomId());
        _print(_safe('_cents">'));
        _print(FormRenderer.t.cents);
        _print(_safe('</label>\n      <input type="text"\n             data-rv-input=\'model.value.cents\'\n             maxlength=\'2\'\n             size=\'2\'\n             id="'));
        _print(this.getDomId());
        _print(_safe('_cents" />\n    </div>\n  '));
      }
    
      _print(_safe('\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/radio"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe(JST["partials/options_field"](this)));
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/section_break"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var formattedDescription;
    
      _print(_safe(JST["partials/labels"](this)));
    
      _print(_safe('\n\n'));
    
      formattedDescription = FormRenderer.formatHTML(this.model.get('description'));
    
      _print(_safe('\n<'));
    
      _print(this.model.sizeToHeaderTag());
    
      _print(_safe('>'));
    
      _print(this.model.get('label'));
    
      _print(_safe('</'));
    
      _print(this.model.sizeToHeaderTag());
    
      _print(_safe('>\n'));
    
      if (formattedDescription) {
        _print(_safe('\n  <div class=\'fr_text size_'));
        _print(this.model.getSize());
        _print(_safe('\'>\n    '));
        _print(_safe(formattedDescription));
        _print(_safe('\n  </div>\n'));
      }
    
      _print(_safe('\n\n<hr />\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/table"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var column, i, j, _i, _j, _k, _l, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3;
    
      _print(_safe('<table class=\'fr_table\'>\n  <thead>\n    <tr>\n      '));
    
      _ref = this.model.getColumns();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        column = _ref[_i];
        _print(_safe('\n        <th>'));
        _print(column.translated_label || column.label);
        _print(_safe('</th>\n      '));
      }
    
      _print(_safe('\n\n      <th class=\'fr_table_col_remove\'></th>\n    </tr>\n  </thead>\n\n  <tbody>\n    '));
    
      for (i = _j = 0, _ref1 = this.model.numRows - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        _print(_safe('\n      <tr data-row-index="'));
        _print(i);
        _print(_safe('">\n        '));
        _ref2 = this.model.getColumns();
        for (j = _k = 0, _len1 = _ref2.length; _k < _len1; j = ++_k) {
          column = _ref2[j];
          _print(_safe('\n          '));
          if (this.model.getPresetValue(column.label, i)) {
            _print(_safe('\n            <td class=\'fr_table_preset\'>\n              <span data-rv-text=\'model.value.'));
            _print(j);
            _print(_safe('.'));
            _print(i);
            _print(_safe('\'></span>\n          '));
          } else {
            _print(_safe('\n            <td>\n              <textarea data-rv-input=\'model.value.'));
            _print(j);
            _print(_safe('.'));
            _print(i);
            _print(_safe('\'\n                        rows=\'1\'\n                        aria-label="'));
            _print(column.translated_label || column.label);
            _print(_safe(' #'));
            _print(i + 1);
            _print(_safe('"\n                        '));
            if (j === 0 && i === 0) {
              _print(_safe('id=\''));
              _print(this.getDomId());
              _print(_safe('\''));
            }
            _print(_safe(' />\n          '));
          }
          _print(_safe('\n          </td>\n        '));
        }
        _print(_safe('\n\n        <td class=\'fr_table_col_remove\'>\n          '));
        if (this.canRemoveRow(i)) {
          _print(_safe('\n            <a class=\'js-remove-row\' href=\'#\'>\n              '));
          _print(_safe(FormRenderer.REMOVE_ROW_ICON));
          _print(_safe('\n            </a>\n          '));
        }
        _print(_safe('\n        </td>\n      </tr>\n    '));
      }
    
      _print(_safe('\n  </tbody>\n\n  '));
    
      if (this.model.get('column_totals')) {
        _print(_safe('\n    <tfoot>\n      <tr>\n        '));
        _ref3 = this.model.getColumns();
        for (j = _l = 0, _len2 = _ref3.length; _l < _len2; j = ++_l) {
          column = _ref3[j];
          _print(_safe('\n          <td data-rv-text=\'model.columnTotals.'));
          _print(j);
          _print(_safe('\'></td>\n        '));
        }
        _print(_safe('\n        <td class="fr_table_col_remove"></td>\n      </tr>\n    </tfoot>\n  '));
      }
    
      _print(_safe('\n</table>\n\n<div class=\'fr_table_add_row_wrapper\'>\n  '));
    
      if (this.model.canAddRows()) {
        _print(_safe('\n    <a class=\'js-add-row\' href=\'#\'>\n      '));
        _print(_safe(FormRenderer.ADD_ROW_ICON));
        _print(_safe('\n      '));
        _print(FormRenderer.t.add_another_row);
        _print(_safe('\n    </a>\n  '));
      }
    
      _print(_safe('\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/text"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<input type="text"\n       id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n       class="size_'));
    
      _print(this.model.getSize());
    
      _print(_safe('"\n       data-rv-input=\'model.value\' />\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/time"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_grid\'>\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="'));
    
      _print(this.getDomId());
    
      _print(_safe('_hours">HH</label>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('_hours"\n           data-rv-input=\'model.value.hours\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_spacer\'>:</div>\n\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="'));
    
      _print(this.getDomId());
    
      _print(_safe('_minutes">MM</label>\n    <input type="text"\n           data-rv-input=\'model.value.minutes\'\n           maxlength=\'2\'\n           size=\'2\'\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('_minutes" />\n  </div>\n\n  '));
    
      if (!this.model.get('disable_seconds')) {
        _print(_safe('\n    <div class=\'fr_spacer\'>:</div>\n\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="'));
        _print(this.getDomId());
        _print(_safe('_seconds">SS</label>\n      <input type="text"\n             data-rv-input=\'model.value.seconds\'\n             maxlength=\'2\'\n             size=\'2\'\n             id="'));
        _print(this.getDomId());
        _print(_safe('_seconds" />\n    </div>\n  '));
      }
    
      _print(_safe('\n\n  <div class=\'has_sub_label\'>\n    <select data-rv-value=\'model.value.am_pm\' data-width=\'auto\' aria-label=\'AM/PM\'>\n      <option value=\'AM\'>AM</option>\n      <option value=\'PM\'>PM</option>\n    </select>\n  </div>\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/website"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<input type="text" inputmode="url"\n       id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n       data-rv-input=\'model.value\'\n       placeholder=\'http://\' />\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["main"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_loading\'>\n  '));
    
      _print(FormRenderer.t.loading_form);
    
      _print(_safe('\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/description"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      if (this.model.get('description')) {
        _print(_safe('\n  <div class=\'fr_description\'>\n    '));
        _print(_safe(FormRenderer.formatHTML(this.model.get('description'))));
        _print(_safe('\n  </div>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/error"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_error\' data-rv-show=\'model.error\' data-rv-text=\'model.error\'></div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/label"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<label '));
    
      if (this.usesFieldset) {
        _print(_safe('aria-hidden="true"'));
      } else {
        _print(_safe('for="'));
        _print(this.getDomId());
        _print(_safe('"'));
      }
    
      _print(_safe('>\n  '));
    
      _print(this.model.get('label'));
    
      _print(_safe(JST["partials/required"](this)));
    
      _print(_safe('\n  '));
    
      _print(_safe(JST["partials/labels"](this)));
    
      _print(_safe('\n</label>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/labels"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      if (this.showLabels) {
        _print(_safe('\n  '));
        if (this.model.get('blind')) {
          _print(_safe('\n    <span class=\'label\'>'));
          _print(FormRenderer.t.blind);
          _print(_safe('</span>\n  '));
        }
        _print(_safe('\n  '));
        if (this.model.get('admin_only')) {
          _print(_safe('\n    <span class=\'label\'>'));
          _print(FormRenderer.t.hidden);
          _print(_safe('</span>\n  '));
        }
        _print(_safe('\n  '));
        if (this.model.isConditional()) {
          _print(_safe('\n    <span class=\'label\'>'));
          _print(FormRenderer.t.hidden_until_rules_met);
          _print(_safe('</span>\n  '));
        }
        _print(_safe('\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/length_counter"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<span class=\'fr_length_counter\' data-rv-text=\'model.currentLength\'></span>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/length_validations"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var max, min, units;
    
      min = this.model.get('minlength');
    
      _print(_safe('\n'));
    
      max = this.model.get('maxlength');
    
      _print(_safe('\n'));
    
      units = this.model.getLengthValidationUnits();
    
      _print(_safe('\n\n'));
    
      if (this.model.hasLengthValidation()) {
        _print(_safe('\n  <div class=\'fr_min_max\'>\n    <span class=\'fr_min_max_guide\'>\n      '));
        if (min && max) {
          _print(_safe('\n        '));
          if (min === max) {
            _print(_safe('\n          '));
            _print(FormRenderer.t.enter_exactly.replace(':num', min));
            _print(_safe(' '));
            _print(FormRenderer.t[units]);
            _print(_safe('.\n        '));
          } else {
            _print(_safe('\n          '));
            _print(FormRenderer.t.enter_between.replace(':min', min).replace(':max', max));
            _print(_safe(' '));
            _print(FormRenderer.t[units]);
            _print(_safe('.\n        '));
          }
          _print(_safe('\n      '));
        } else if (min) {
          _print(_safe('\n        '));
          _print(FormRenderer.t.enter_at_least.replace(':min', min));
          _print(_safe(' '));
          _print(FormRenderer.t[units]);
          _print(_safe('.\n      '));
        } else if (max) {
          _print(_safe('\n        '));
          _print(FormRenderer.t.enter_up_to.replace(':max', max));
          _print(_safe(' '));
          _print(FormRenderer.t[units]);
          _print(_safe('.\n      '));
        }
        _print(_safe('\n    </span>\n\n    '));
        _print(_safe(JST["partials/length_counter"](this)));
        _print(_safe('\n  </div>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/min_max_validations"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var max, min;
    
      if (this.model.hasMinMaxValidation()) {
        _print(_safe('\n  '));
        min = this.model.get('min');
        _print(_safe('\n  '));
        max = this.model.get('max');
        _print(_safe('\n\n  <div class=\'fr_min_max\'>\n    '));
        if (min && max) {
          _print(_safe('\n      '));
          _print(FormRenderer.t.enter_between.replace(':min', min).replace(':max', max));
          _print(_safe('.\n    '));
        } else if (min) {
          _print(_safe('\n      '));
          _print(FormRenderer.t.enter_at_least.replace(':min', min));
          _print(_safe('.\n    '));
        } else if (max) {
          _print(_safe('\n      '));
          _print(FormRenderer.t.enter_up_to.replace(':max', max));
          _print(_safe('.\n    '));
        }
        _print(_safe('\n  </div>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/non_input_response_field"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe(JST["fields/" + this.model.field_type](this)));
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/options_field"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var fieldType, option, _i, _len, _ref;
    
      fieldType = this.model.field_type === 'radio' ? 'radio' : 'checkbox';
    
      _print(_safe('\n\n'));
    
      _ref = this.model.getOptions();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        _print(_safe('\n  <label class=\'fr_option control\'>\n    <input type=\''));
        _print(fieldType);
        _print(_safe('\' data-rv-checkedarray=\'model.value.checked\' value="'));
        _print(option.label);
        _print(_safe('" />\n    '));
        _print(option.translated_label || option.label);
        _print(_safe('\n  </label>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (this.model.get('include_other_option')) {
        _print(_safe('\n  <div class=\'fr_option fr_other_option\'>\n    <label class=\'control\'>\n      <input type=\''));
        _print(fieldType);
        _print(_safe('\' data-rv-checked=\'model.value.other_checked\' />\n      '));
        _print(FormRenderer.t.other);
        _print(_safe('\n    </label>\n\n    <input type=\'text\' data-rv-show=\'model.value.other_checked\' data-rv-input=\'model.value.other_text\' placeholder=\''));
        _print(FormRenderer.t.write_here);
        _print(_safe('\' />\n  </div>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/pagination"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var i, idx, _i, _len, _ref;
    
      if (this.form_renderer.visiblePages().length > 1) {
        _print(_safe('\n  <ul class=\'fr_pagination\'>\n    '));
        _ref = this.form_renderer.visiblePages();
        for (idx = _i = 0, _len = _ref.length; _i < _len; idx = ++_i) {
          i = _ref[idx];
          _print(_safe('\n      <li class=\''));
          if (!this.form_renderer.isPageValid(i)) {
            _print(_safe('has_errors'));
          }
          _print(_safe('\'>\n        '));
          if (i === this.form_renderer.state.get('activePage')) {
            _print(_safe('\n          <span>'));
            _print(idx + 1);
            _print(_safe('</span>\n        </li>\n        '));
          } else {
            _print(_safe('\n          <a data-activate-page="'));
            _print(i);
            _print(_safe('" href=\'#\'>\n            '));
            _print(idx + 1);
            _print(_safe('\n          </a>\n        '));
          }
          _print(_safe('\n      </li>\n    '));
        }
        _print(_safe('\n  </ul>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/repeating_group"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'repeating_group_label\'>\n  '));
    
      _print(this.model.get('label'));
    
      _print(_safe('\n  '));
    
      _print(_safe(JST["partials/required"](this)));
    
      _print(_safe('\n</div>\n\n<div data-rv-hide=\'model.skipped\'>\n  <div class=\'repeating_group_entries\'>\n  </div>\n\n  '));
    
      if (!this.model.isRequired()) {
        _print(_safe('\n    <a href=\'#\' class=\'js-skip\'>Skip this question</a>\n  '));
      }
    
      _print(_safe('\n\n  '));
    
      if (this.model.canAdd()) {
        _print(_safe('\n    <a href=\'#\' class=\'js-add-entry\'>Add another</a>\n  '));
      }
    
      _print(_safe('\n</div>\n\n'));
    
      if (!this.model.isRequired()) {
        _print(_safe('\n  <div data-rv-show=\'model.skipped\'>\n    This field is skipped\n    <a href=\'#\' class=\'js-skip\'>Answer this question</a>\n  </div>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/repeating_group_entry"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'repeating_group_entry_idx\'>#'));
    
      _print(this.idx + 1);
    
      _print(_safe('</div>\n\n<div class=\'repeating_group_entry_fields\'>\n</div>\n\n'));
    
      if (this.entry.canRemove()) {
        _print(_safe('\n  <a href=\'#\' class=\'js-remove-entry\'>Remove</a>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/required"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      if (this.model.get('required')) {
        _print(_safe('&nbsp;<abbr class=\'fr_required\' title=\'required\'>*</abbr>'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/response_field"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      if (this.model.wrapper === 'fieldset') {
        _print(_safe('\n  <fieldset class=\'fr_fieldset\'>\n    <legend>'));
        _print(this.model.get('label'));
        _print(_safe('</legend>\n    '));
        _print(_safe(JST["partials/label"](this)));
        _print(_safe('\n    <div class=\'fr_field_wrapper\'>\n      '));
        _print(_safe(JST["fields/" + this.model.field_type](this)));
        _print(_safe('\n    </div>\n  </fieldset>\n'));
      } else if (this.model.wrapper === 'label') {
        _print(_safe('\n  '));
        _print(_safe(JST["partials/label"](this)));
        _print(_safe('\n  <div class=\'fr_field_wrapper\'>\n    '));
        _print(_safe(JST["fields/" + this.model.field_type](this)));
        _print(_safe('\n  </div>\n'));
      } else {
        _print(_safe('\n  <div class=\'fr_field_wrapper\'>\n    '));
        _print(_safe(JST["fields/" + this.model.field_type](this)));
        _print(_safe('\n  </div>\n'));
      }
    
      _print(_safe('\n\n'));
    
      _print(_safe(JST["partials/length_validations"](this)));
    
      _print(_safe('\n'));
    
      _print(_safe(JST["partials/min_max_validations"](this)));
    
      _print(_safe('\n'));
    
      _print(_safe(JST["partials/error"](this)));
    
      _print(_safe('\n'));
    
      _print(_safe(JST["partials/description"](this)));
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["plugins/bookmark_draft"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      _print(_safe('<div class=\'fr_bookmark\'>\n  <a href=\'#\' class=\'js-fr-bookmark\'>'));
    
      _print(FormRenderer.t.finish_later);
    
      _print(_safe('</a>\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["plugins/bottom_bar"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
    
      _print(_safe('<div class=\'fr_bottom\'>\n  '));
    
      if (__indexOf.call(this.form_renderer.options.plugins, 'Autosave') >= 0) {
        _print(_safe('\n    <div class=\'fr_bottom_l\'>\n      '));
        if (this.form_renderer.state.get('hasServerErrors')) {
          _print(_safe('\n        '));
          _print(this.form_renderer.state.get('serverErrorText') || FormRenderer.t.error_saving);
          _print(_safe('\n      '));
        } else if (this.form_renderer.state.get('hasChanges')) {
          _print(_safe('\n        '));
          _print(FormRenderer.t.saving);
          _print(_safe('\n      '));
        } else {
          _print(_safe('\n        '));
          _print(FormRenderer.t.saved);
          _print(_safe('\n      '));
        }
        _print(_safe('\n    </div>\n  '));
      }
    
      _print(_safe('\n\n  <div class=\'fr_bottom_r\'>\n    '));
    
      if (!this.form_renderer.isFirstPage()) {
        _print(_safe('\n      <button data-fr-previous-page class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>\n        '));
        _print(FormRenderer.t.back_to_page.replace(':num', this.form_renderer.previousPage()));
        _print(_safe('\n      </button>\n    '));
      }
    
      _print(_safe('\n\n    '));
    
      if (this.form_renderer.state.get('submitting')) {
        _print(_safe('\n      <button disabled class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>\n        '));
        _print(FormRenderer.t.submitting);
        _print(_safe('\n      </button>\n    '));
      } else {
        _print(_safe('\n      <button data-fr-next-page class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>\n        '));
        if (this.form_renderer.isLastPage() || !this.form_renderer.options.enablePages) {
          _print(FormRenderer.t.submit);
        } else {
          _print(FormRenderer.t.next_page);
        }
        _print(_safe('\n      </button>\n    '));
      }
    
      _print(_safe('\n  </div>\n</div>\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};

if (!window.JST) {
  window.JST = {};
}
window.JST["plugins/error_bar"] = function(__obj) {
  var _safe = function(value) {
    if (typeof value === 'undefined' && value == null)
      value = '';
    var result = new String(value);
    result.ecoSafe = true;
    return result;
  };
  return (function() {
    var __out = [], __self = this, _print = function(value) {
      if (typeof value !== 'undefined' && value != null)
        __out.push(value.ecoSafe ? value : __self.escape(value));
    }, _capture = function(callback) {
      var out = __out, result;
      __out = [];
      callback.call(this);
      result = __out.join('');
      __out = out;
      return _safe(result);
    };
    (function() {
      if (!this.form_renderer.areAllPagesValid()) {
        _print(_safe('\n  <div class=\'fr_error_alert_bar\' role=\'alert\'>\n    '));
        _print(_safe(FormRenderer.t.error_bar.errors));
        _print(_safe('\n  </div>\n'));
      }
    
      _print(_safe('\n'));
    
    }).call(this);
    
    return __out.join('');
  }).call((function() {
    var obj = {
      escape: function(value) {
        return ('' + value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      },
      safe: _safe
    }, key;
    for (key in __obj) obj[key] = __obj[key];
    return obj;
  })());
};
})(window);