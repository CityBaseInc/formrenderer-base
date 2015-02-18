(function() {
  var inputEvent;

  inputEvent = document.addEventListener ? 'input' : 'keyup';

  rivets.binders.input = {
    publishes: true,
    routine: rivets.binders.value.routine,
    bind: function(el) {
      return $(el).bind("" + inputEvent + ".rivets", this.publish);
    },
    unbind: function(el) {
      return $(el).unbind("" + inputEvent + ".rivets");
    }
  };

  rivets.formatters.prepend = function(value, x) {
    return "" + x + value;
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

}).call(this);

(function() {
  var FormRenderer;

  window.FormRenderer = FormRenderer = Backbone.View.extend({
    defaults: {
      enableAutosave: true,
      enableBeforeUnload: true,
      enablePages: true,
      enableErrorAlertBar: true,
      enableBottomStatusBar: true,
      enableLocalstorage: true,
      screendoorBase: 'https://screendoor.dobt.co',
      target: '[data-formrenderer]',
      validateImmediately: false,
      response: {},
      preview: false,
      skipValidation: void 0,
      saveParams: {},
      showLabels: false
    },
    constructor: function(options) {
      this.options = $.extend({}, this.defaults, options);
      this.uploads = 0;
      this.state = new Backbone.Model({
        hasChanges: false
      });
      this.setElement($(this.options.target));
      this.$el.addClass('fr_form');
      this.$el.data('form-renderer', this);
      this.subviews = {
        pages: {}
      };
      this.$el.html(JST['main'](this));
      if (this.options.enableLocalstorage && store.enabled) {
        this.initLocalstorage();
      }
      this.loadFromServer((function(_this) {
        return function() {
          _this.$el.find('.fr_loading').remove();
          _this.initResponseFields();
          _this.initPages();
          if (_this.options.enablePages) {
            _this.initPagination();
          } else {
            _this.initNoPagination();
          }
          if (_this.options.enableBottomStatusBar) {
            _this.initBottomStatusBar();
          }
          if (_this.options.enableErrorAlertBar) {
            _this.initErrorAlertBar();
          }
          if (_this.options.enableAutosave) {
            _this.initAutosave();
          }
          if (_this.options.enableBeforeUnload) {
            _this.initBeforeUnload();
          }
          if (_this.options.validateImmediately) {
            _this.validateAllPages();
          }
          return _this.initConditions();
        };
      })(this));
      return this;
    },
    initLocalstorage: function() {
      var _base;
      (_base = this.options.response).id || (_base.id = store.get(this.draftIdStorageKey()));
      return this.listenTo(this, 'afterSave', function() {
        if (!this.state.get('submitting')) {
          return store.set(this.draftIdStorageKey(), this.options.response.id);
        }
      });
    },
    loadFromServer: function(cb) {
      if ((this.options.response_fields != null) && (this.options.response.responses != null)) {
        return cb();
      }
      return $.ajax({
        url: "" + this.options.screendoorBase + "/api/form_renderer/load",
        type: 'get',
        dataType: 'json',
        data: {
          project_id: this.options.project_id,
          response_id: this.options.response.id,
          v: 0
        },
        success: (function(_this) {
          return function(data) {
            var _base, _base1, _ref;
            _this.options.response.id = data.response_id;
            (_base = _this.options).response_fields || (_base.response_fields = data.project.response_fields);
            (_base1 = _this.options.response).responses || (_base1.responses = ((_ref = data.response) != null ? _ref.responses : void 0) || {});
            return cb();
          };
        })(this),
        error: (function(_this) {
          return function() {
            return store.remove(_this.draftIdStorageKey());
          };
        })(this)
      });
    },
    initResponseFields: function() {
      var model, rf, _i, _len, _ref;
      this.response_fields = new Backbone.Collection;
      _ref = this.options.response_fields;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        rf = _ref[_i];
        model = new FormRenderer.Models["ResponseField" + (_.str.classify(rf.field_type))](rf, {
          form_renderer: this
        });
        if (model.input_field) {
          model.setExistingValue(this.options.response.responses[model.get('id')]);
        }
        this.response_fields.add(model);
      }
      return this.listenTo(this.response_fields, 'change', function() {
        if (!this.state.get('hasChanges')) {
          return this.state.set('hasChanges', true);
        }
      });
    },
    initAutosave: function() {
      return setInterval((function(_this) {
        return function() {
          if (_this.state.get('hasChanges') && !_this.isSaving) {
            return _this.save();
          }
        };
      })(this), 5000);
    },
    initBottomStatusBar: function() {
      this.subviews.bottomStatusBar = new FormRenderer.Views.BottomStatusBar({
        form_renderer: this
      });
      return this.$el.append(this.subviews.bottomStatusBar.render().el);
    },
    initErrorAlertBar: function() {
      this.subviews.errorAlertBar = new FormRenderer.Views.ErrorAlertBar({
        form_renderer: this
      });
      return this.$el.prepend(this.subviews.errorAlertBar.render().el);
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
      this.numPages = this.response_fields.filter(function(rf) {
        return rf.get('field_type') === 'page_break';
      }).length + 1;
      this.state.set('activePage', 1);
      currentPageInLoop = 1;
      addPage();
      this.response_fields.each((function(_this) {
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
    initBeforeUnload: function() {
      return BeforeUnload.enable({
        "if": (function(_this) {
          return function() {
            return _this.state.get('hasChanges');
          };
        })(this)
      });
    },
    activatePage: function(newPageNumber, opts) {
      if (opts == null) {
        opts = {};
      }
      if (!(opts.skipValidation || this.validateCurrentPage())) {
        return;
      }
      this.subviews.pages[this.state.get('activePage')].hide();
      this.subviews.pages[newPageNumber].show();
      return this.state.set('activePage', newPageNumber);
    },
    validateCurrentPage: function() {
      this.trigger("beforeValidate beforeValidate:" + (this.state.get('activePage')));
      this.subviews.pages[this.state.get('activePage')].validate();
      this.trigger("afterValidate afterValidate:" + (this.state.get('activePage')));
      return this.isPageValid(this.state.get('activePage'));
    },
    validateAllPages: function() {
      var page, _, _ref;
      this.trigger('beforeValidate beforeValidate:all');
      _ref = this.subviews.pages;
      for (_ in _ref) {
        page = _ref[_];
        page.validate();
      }
      this.trigger('afterValidate afterValidate:all');
      return this.areAllPagesValid();
    },
    isPageVisible: function(pageNumber) {
      return !!_.find(this.subviews.pages[pageNumber].models, (function(rf) {
        return rf.isVisible;
      }));
    },
    isPageValid: function(pageNumber) {
      return !_.find(this.subviews.pages[pageNumber].models, (function(rf) {
        return rf.input_field && rf.errors.length > 0;
      }));
    },
    areAllPagesValid: function() {
      var _i, _ref, _results;
      return _.every((function() {
        _results = [];
        for (var _i = 1, _ref = this.numPages; 1 <= _ref ? _i <= _ref : _i >= _ref; 1 <= _ref ? _i++ : _i--){ _results.push(_i); }
        return _results;
      }).apply(this), (function(_this) {
        return function(x) {
          return _this.isPageValid(x);
        };
      })(this));
    },
    numValidationErrors: function() {
      return this.response_fields.filter(function(rf) {
        return rf.input_field && rf.errors.length > 0;
      }).length;
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
      return this.state.get('activePage') === this.visiblePages()[0];
    },
    isLastPage: function() {
      return this.state.get('activePage') === _.last(this.visiblePages());
    },
    previousPage: function() {
      return this.visiblePages()[_.indexOf(this.visiblePages(), this.state.get('activePage')) - 1];
    },
    nextPage: function() {
      return this.visiblePages()[_.indexOf(this.visiblePages(), this.state.get('activePage')) + 1];
    },
    draftIdStorageKey: function() {
      return "project-" + this.options.project_id + "-response-id";
    },
    getValue: function() {
      return _.tap({}, (function(_this) {
        return function(h) {
          return _this.response_fields.each(function(rf) {
            var gotValue;
            if (!rf.input_field) {
              return;
            }
            if (!rf.isVisible) {
              return;
            }
            gotValue = rf.getValue();
            if ((typeof gotValue === 'object') && gotValue.merge) {
              delete gotValue.merge;
              return _.extend(h, gotValue);
            } else {
              return h[rf.get('id')] = gotValue;
            }
          });
        };
      })(this));
    },
    saveParams: function() {
      return _.extend({
        v: 0,
        response_id: this.options.response.id,
        project_id: this.options.project_id,
        skip_validation: this.options.skipValidation
      }, this.options.saveParams);
    },
    save: function(options) {
      if (options == null) {
        options = {};
      }
      this.isSaving = true;
      return $.ajax({
        url: "" + this.options.screendoorBase + "/api/form_renderer/save",
        type: 'post',
        dataType: 'json',
        data: _.extend(this.saveParams(), {
          raw_responses: this.getValue(),
          submit: options.submit ? true : void 0
        }),
        complete: (function(_this) {
          return function() {
            var _ref;
            _this.isSaving = false;
            if ((_ref = options.complete) != null) {
              _ref.apply(_this, arguments);
            }
            return _this.trigger('afterSave');
          };
        })(this),
        success: (function(_this) {
          return function(data) {
            var _ref;
            _this.state.set({
              hasChanges: false,
              hasServerErrors: false
            });
            _this.options.response.id = data.response_id;
            return (_ref = options.success) != null ? _ref.apply(_this, arguments) : void 0;
          };
        })(this),
        error: (function(_this) {
          return function() {
            var _ref;
            _this.state.set({
              hasServerErrors: true,
              submitting: false
            });
            return (_ref = options.error) != null ? _ref.apply(_this, arguments) : void 0;
          };
        })(this)
      });
    },
    autosaveImmediately: function() {
      if (this.state.get('hasChanges') && !this.isSaving && this.options.enableAutosave) {
        return this.save();
      }
    },
    waitForUploads: function(cb) {
      if (this.uploads > 0) {
        return setTimeout(((function(_this) {
          return function() {
            return _this.waitForUploads(cb);
          };
        })(this)), 100);
      } else {
        return cb();
      }
    },
    submit: function(opts) {
      var afterSubmit;
      if (opts == null) {
        opts = {};
      }
      if (!(opts.skipValidation || this.options.skipValidation || this.validateAllPages())) {
        return;
      }
      this.state.set('submitting', true);
      if (this.options.preview) {
        return this.preview();
      }
      afterSubmit = opts.afterSubmit || this.options.afterSubmit;
      return this.waitForUploads((function(_this) {
        return function() {
          return _this.save({
            submit: true,
            success: function() {
              var $page;
              store.remove(_this.draftIdStorageKey());
              if (typeof afterSubmit === 'function') {
                return afterSubmit.call(_this);
              } else if (typeof afterSubmit === 'string') {
                return window.location = afterSubmit.replace(':id', _this.options.response.id);
              } else if (typeof afterSubmit === 'object' && afterSubmit.method === 'page') {
                $page = $("<div class='fr_after_submit_page'>" + afterSubmit.html + "</div>");
                return _this.$el.replaceWith($page);
              } else {
                return console.log('[FormRenderer] Not sure what to do...');
              }
            }
          });
        };
      })(this));
    },
    preview: function() {
      var cb;
      cb = (function(_this) {
        return function() {
          return window.location = _this.options.preview.replace(':id', _this.options.response.id);
        };
      })(this);
      if (this.state.get('hasChanges') || !this.options.enableAutosave || !this.options.response.id) {
        return this.save({
          success: cb
        });
      } else {
        return cb();
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
    },
    runConditions: function(rf) {
      _.each(this.conditionsForResponseField(rf), function(c) {
        return c.parent.calculateVisibility();
      });
      return this.reflectConditions();
    },
    conditionsForResponseField: function(rf) {
      return _.filter(this.allConditions, function(condition) {
        return ("" + condition.response_field_id) === ("" + rf.id);
      });
    },
    initConditions: function() {
      this.listenTo(this.response_fields, 'change:value change:value.*', (function(_this) {
        return function(rf) {
          return _this.runConditions(rf);
        };
      })(this));
      return this.allConditions = _.flatten(this.response_fields.map(function(rf) {
        return _.map(rf.getConditions(), function(c) {
          return _.extend({}, c, {
            parent: rf
          });
        });
      }));
    },
    isConditionalVisible: function(condition) {
      return new FormRenderer.ConditionChecker(this, condition).isVisible();
    }
  });

  FormRenderer.INPUT_FIELD_TYPES = ['identification', 'address', 'checkboxes', 'date', 'dropdown', 'email', 'file', 'number', 'paragraph', 'price', 'radio', 'table', 'text', 'time', 'website', 'map_marker'];

  FormRenderer.NON_INPUT_FIELD_TYPES = ['block_of_text', 'page_break', 'section_break'];

  FormRenderer.FIELD_TYPES = _.union(FormRenderer.INPUT_FIELD_TYPES, FormRenderer.NON_INPUT_FIELD_TYPES);

  FormRenderer.Views = {};

  FormRenderer.Models = {};

  FormRenderer.Validators = {};

  FormRenderer.BUTTON_CLASS = '';

  FormRenderer.DEFAULT_LAT_LNG = [40.7700118, -73.9800453];

  FormRenderer.MAPBOX_URL = 'https://api.tiles.mapbox.com/mapbox.js/v2.1.4/mapbox.js';

  FormRenderer.FILE_TYPES = {};

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

}).call(this);

(function() {
  FormRenderer.ConditionChecker = (function() {
    function ConditionChecker(form_renderer, condition) {
      this.form_renderer = form_renderer;
      this.condition = condition;
      this.value = this.responseField().toText() || '';
    }

    ConditionChecker.prototype.method_eq = function() {
      return this.value.toLowerCase() === this.condition.value.toLowerCase();
    };

    ConditionChecker.prototype.method_contains = function() {
      return !!this.value.toLowerCase().match(this.condition.value.toLowerCase());
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

    ConditionChecker.prototype.length = function() {
      return new FormRenderer.Validators.MinMaxLengthValidator(this.responseField()).count();
    };

    ConditionChecker.prototype.isValid = function() {
      return _.all(['value', 'action', 'response_field_id', 'method'], (function(_this) {
        return function(x) {
          return _this.condition[x];
        };
      })(this));
    };

    ConditionChecker.prototype.isVisible = function() {
      if (this.isValid()) {
        return this.actionBool() === this["method_" + this.condition.method]();
      } else {
        return true;
      }
    };

    ConditionChecker.prototype.actionBool = function() {
      return this.condition.action === 'show';
    };

    ConditionChecker.prototype.responseField = function() {
      return this.form_renderer.response_fields.get(this.condition.response_field_id);
    };

    return ConditionChecker;

  })();

}).call(this);

(function() {
  FormRenderer.Validators.BaseValidator = (function() {
    function BaseValidator(model) {
      this.model = model;
    }

    return BaseValidator;

  })();

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.DateValidator = (function(_super) {
    __extends(DateValidator, _super);

    function DateValidator() {
      return DateValidator.__super__.constructor.apply(this, arguments);
    }

    DateValidator.prototype.validate = function() {
      var day, month, year;
      if (this.model.field_type !== 'date') {
        return;
      }
      year = parseInt(this.model.get('value.year'), 10) || 0;
      day = parseInt(this.model.get('value.day'), 10) || 0;
      month = parseInt(this.model.get('value.month'), 10) || 0;
      if (!((year > 0) && ((0 < day && day <= 31)) && ((0 < month && month <= 12)))) {
        return 'not a valid date';
      }
    };

    return DateValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.EmailValidator = (function(_super) {
    __extends(EmailValidator, _super);

    function EmailValidator() {
      return EmailValidator.__super__.constructor.apply(this, arguments);
    }

    EmailValidator.prototype.validate = function() {
      if (this.model.field_type !== 'email') {
        return;
      }
      if (!this.model.get('value').match('@')) {
        return 'not a valid email';
      }
    };

    return EmailValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.IdentificationValidator = (function(_super) {
    __extends(IdentificationValidator, _super);

    function IdentificationValidator() {
      return IdentificationValidator.__super__.constructor.apply(this, arguments);
    }

    IdentificationValidator.prototype.validate = function() {
      if (!this.model.get('value.name') || !this.model.get('value.email')) {
        return 'please enter your name and email';
      } else if (!this.model.get('value.email').match('@')) {
        return 'email is invalid';
      }
    };

    return IdentificationValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.IntegerValidator = (function(_super) {
    __extends(IntegerValidator, _super);

    function IntegerValidator() {
      return IntegerValidator.__super__.constructor.apply(this, arguments);
    }

    IntegerValidator.VALID_REGEX = /^-?\d+$/;

    IntegerValidator.prototype.validate = function() {
      if (!this.model.get('field_options.integer_only')) {
        return;
      }
      if (!this.model.get('value').match(this.constructor.VALID_REGEX)) {
        return 'is not an integer';
      }
    };

    return IntegerValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.MinMaxLengthValidator = (function(_super) {
    __extends(MinMaxLengthValidator, _super);

    function MinMaxLengthValidator() {
      return MinMaxLengthValidator.__super__.constructor.apply(this, arguments);
    }

    MinMaxLengthValidator.prototype.validate = function() {
      if (!(this.model.get('field_options.minlength') || this.model.get('field_options.maxlength'))) {
        return;
      }
      this.min = parseInt(this.model.get('field_options.minlength'), 10) || void 0;
      this.max = parseInt(this.model.get('field_options.maxlength'), 10) || void 0;
      if (this.min && this.count() < this.min) {
        return 'is too short';
      } else if (this.max && this.count() > this.max) {
        return 'is too long';
      }
    };

    MinMaxLengthValidator.prototype.count = function() {
      if (this.model.getLengthValidationUnits() === 'words') {
        return this.countWords();
      } else {
        return this.countCharacters();
      }
    };

    MinMaxLengthValidator.prototype.countWords = function() {
      return (_.str.trim(this.model.get('value')).replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || '').length;
    };

    MinMaxLengthValidator.prototype.countCharacters = function() {
      return _.str.trim(this.model.get('value')).replace(/\s/g, '').length;
    };

    return MinMaxLengthValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.MinMaxValidator = (function(_super) {
    __extends(MinMaxValidator, _super);

    function MinMaxValidator() {
      return MinMaxValidator.__super__.constructor.apply(this, arguments);
    }

    MinMaxValidator.prototype.validate = function() {
      var value;
      if (!(this.model.get('field_options.min') || this.model.get('field_options.max'))) {
        return;
      }
      this.min = this.model.get('field_options.min') && parseFloat(this.model.get('field_options.min'));
      this.max = this.model.get('field_options.max') && parseFloat(this.model.get('field_options.max'));
      value = this.model.field_type === 'price' ? parseFloat("" + (this.model.get('value.dollars') || 0) + "." + (this.model.get('value.cents') || 0)) : parseFloat(this.model.get('value').replace(/,/g, ''));
      if (this.min && value < this.min) {
        return 'is too small';
      } else if (this.max && value > this.max) {
        return 'is too large';
      }
    };

    return MinMaxValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.NumberValidator = (function(_super) {
    __extends(NumberValidator, _super);

    function NumberValidator() {
      return NumberValidator.__super__.constructor.apply(this, arguments);
    }

    NumberValidator.VALID_REGEX = /^-?\d*(\.\d+)?$/;

    NumberValidator.prototype.validate = function() {
      var value;
      if (this.model.field_type !== 'number') {
        return;
      }
      value = this.model.get('value');
      value = value.replace(/,/g, '').replace(/-/g, '').replace(/^\+/, '');
      if (!value.match(this.constructor.VALID_REGEX)) {
        return 'not a valid number';
      }
    };

    return NumberValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.PriceValidator = (function(_super) {
    __extends(PriceValidator, _super);

    function PriceValidator() {
      return PriceValidator.__super__.constructor.apply(this, arguments);
    }

    PriceValidator.prototype.validate = function() {
      var values;
      if (this.model.field_type !== 'price') {
        return;
      }
      values = [];
      if (this.model.get('value.dollars')) {
        values.push(this.model.get('value.dollars').replace(/,/g, ''));
      }
      if (this.model.get('value.cents')) {
        values.push(this.model.get('value.cents'));
      }
      if (!_.every(values, function(x) {
        return x.match(/^-?\d+$/);
      })) {
        return "isn't a valid price";
      }
    };

    return PriceValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Validators.TimeValidator = (function(_super) {
    __extends(TimeValidator, _super);

    function TimeValidator() {
      return TimeValidator.__super__.constructor.apply(this, arguments);
    }

    TimeValidator.prototype.validate = function() {
      var hours, minutes, seconds;
      if (this.model.field_type !== 'time') {
        return;
      }
      hours = parseInt(this.model.get('value.hours'), 10) || 0;
      minutes = parseInt(this.model.get('value.minutes'), 10) || 0;
      seconds = parseInt(this.model.get('value.seconds'), 10) || 0;
      if (!(((1 <= hours && hours <= 12)) && ((0 <= minutes && minutes <= 60)) && ((0 <= seconds && seconds <= 60)))) {
        return "isn't a valid time";
      }
    };

    return TimeValidator;

  })(FormRenderer.Validators.BaseValidator);

}).call(this);

(function() {
  var i, _i, _len, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  FormRenderer.Models.ResponseField = Backbone.DeepModel.extend({
    input_field: true,
    field_type: void 0,
    validators: [],
    sync: function() {},
    initialize: function(_attrs, options) {
      if (options == null) {
        options = {};
      }
      this.form_renderer = options.form_renderer;
      this.errors = [];
      this.calculateVisibility();
      if (this.hasLengthValidations()) {
        return this.listenTo(this, 'change:value', this.calculateLength);
      }
    },
    validate: function() {
      var newError, v, validator, validatorName, _ref, _results;
      this.errors = [];
      if (!this.isVisible) {
        return;
      }
      if (!this.hasValue()) {
        if (this.get('required')) {
          this.errors.push("can't be blank");
        }
        return;
      }
      _ref = this.validators;
      _results = [];
      for (validatorName in _ref) {
        validator = _ref[validatorName];
        v = new validator(this);
        newError = v.validate();
        if (newError) {
          _results.push(this.errors.push(newError));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    getError: function() {
      if (this.errors.length > 0) {
        return this.errors.join('. ');
      }
    },
    hasLengthValidations: function() {
      var _ref;
      return (_ref = FormRenderer.Validators.MinMaxLengthValidator, __indexOf.call(this.validators, _ref) >= 0) && this.get('field_options.minlength') || this.get('field_options.maxlength');
    },
    calculateLength: function() {
      var v;
      v = new FormRenderer.Validators.MinMaxLengthValidator(this);
      return this.set('currentLength', v[this.getLengthValidationUnits() === 'words' ? 'countWords' : 'countCharacters']());
    },
    hasMinMaxValidations: function() {
      var _ref;
      return (_ref = FormRenderer.Validators.MinMaxValidator, __indexOf.call(this.validators, _ref) >= 0) && this.get('field_options.min') || this.get('field_options.max');
    },
    getLengthValidationUnits: function() {
      return this.get('field_options.min_max_length_units') || 'characters';
    },
    setExistingValue: function(x) {
      if (x) {
        this.set('value', x);
      }
      if (this.hasLengthValidations()) {
        return this.calculateLength();
      }
    },
    getValue: function() {
      return this.get('value');
    },
    toText: function() {
      return this.getValue();
    },
    hasValue: function() {
      return !!this.get('value');
    },
    hasAnyValueInHash: function() {
      return _.some(this.get('value'), function(v, k) {
        return !!v;
      });
    },
    hasValueHashKey: function(keys) {
      return _.some(keys, (function(_this) {
        return function(key) {
          return !!_this.get("value." + key);
        };
      })(this));
    },
    getOptions: function() {
      return this.get('field_options.options') || [];
    },
    getColumns: function() {
      return this.get('field_options.columns') || [];
    },
    columnOrOptionKeypath: function() {
      if (this.field_type === 'table') {
        return 'field_options.columns';
      } else {
        return 'field_options.options';
      }
    },
    addOptionOrColumnAtIndex: function(i) {
      var newOpt, opts;
      opts = this.field_type === 'table' ? this.getColumns() : this.getOptions();
      newOpt = {
        label: ''
      };
      if (this.field_type !== 'table') {
        newOpt['checked'] = false;
      }
      if (i === -1) {
        opts.push(newOpt);
      } else {
        opts.splice(i + 1, 0, newOpt);
      }
      this.set(this.columnOrOptionKeypath(), opts);
      return this.trigger('change');
    },
    removeOptionOrColumnAtIndex: function(i) {
      var opts;
      opts = this.get(this.columnOrOptionKeypath());
      opts.splice(i, 1);
      this.set(this.columnOrOptionKeypath(), opts);
      return this.trigger('change');
    },
    getConditions: function() {
      return this.get('field_options.conditions') || [];
    },
    calculateVisibility: function() {
      return this.isVisible = (!this.form_renderer ? true : this.getConditions() && !_.isEmpty(this.getConditions()) ? !!_.find(this.getConditions(), (function(_this) {
        return function(c) {
          return _this.form_renderer.isConditionalVisible(c);
        };
      })(this)) : true);
    }
  });

  FormRenderer.Models.NonInputResponseField = FormRenderer.Models.ResponseField.extend({
    input_field: false,
    field_type: void 0,
    validate: function() {},
    sync: function() {}
  });

  FormRenderer.Models.ResponseFieldIdentification = FormRenderer.Models.ResponseField.extend({
    field_type: 'identification',
    validators: [FormRenderer.Validators.IdentificationValidator],
    hasValue: function() {
      return true;
    }
  });

  FormRenderer.Models.ResponseFieldMapMarker = FormRenderer.Models.ResponseField.extend({
    field_type: 'map_marker',
    hasValue: function() {
      return _.every(['lat', 'lng'], (function(_this) {
        return function(key) {
          return !!_this.get("value." + key);
        };
      })(this));
    },
    latLng: function() {
      if (this.hasValue()) {
        return [this.get('value.lat'), this.get('value.lng')];
      }
    },
    defaultLatLng: function() {
      var lat, lng;
      if ((lat = this.get('field_options.default_lat')) && (lng = this.get('field_options.default_lng'))) {
        return [lat, lng];
      }
    }
  });

  FormRenderer.Models.ResponseFieldAddress = FormRenderer.Models.ResponseField.extend({
    field_type: 'address',
    setExistingValue: function(x) {
      var _ref;
      FormRenderer.Models.ResponseField.prototype.setExistingValue.apply(this, arguments);
      if ((_ref = this.get('field_options.address_format')) !== 'city_state' && _ref !== 'city_state_zip') {
        if (!(x != null ? x.country : void 0)) {
          return this.set('value.country', 'US');
        }
      }
    },
    hasValue: function() {
      return this.hasValueHashKey(['street', 'city', 'state', 'zipcode']);
    },
    toText: function() {
      return _.values(_.pick(this.getValue(), 'street', 'city', 'state', 'zipcode', 'country')).join(' ');
    }
  });

  FormRenderer.Models.ResponseFieldCheckboxes = FormRenderer.Models.ResponseField.extend({
    field_type: 'checkboxes',
    setExistingValue: function(x) {
      return this.set('value', _.tap({}, (function(_this) {
        return function(h) {
          var i, option, _i, _j, _len, _len1, _ref, _ref1, _results;
          if (!_.isEmpty(x)) {
            _ref = _this.getOptions();
            for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
              option = _ref[i];
              h["" + i] = x[option.label];
            }
            if (x.Other) {
              h['other_checkbox'] = true;
              return h['other'] = x.Other;
            }
          } else {
            _ref1 = _this.getOptions();
            _results = [];
            for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
              option = _ref1[i];
              _results.push(h["" + i] = _.toBoolean(option.checked));
            }
            return _results;
          }
        };
      })(this)));
    },
    getValue: function() {
      var k, returnValue, v, _ref;
      returnValue = {};
      _ref = this.get('value');
      for (k in _ref) {
        v = _ref[k];
        returnValue[k] = v === true ? 'on' : v;
      }
      return returnValue;
    },
    toText: function() {
      var values;
      values = _.tap([], (function(_this) {
        return function(a) {
          var idx, k, v, _ref;
          _ref = _this.get('value');
          for (k in _ref) {
            v = _ref[k];
            idx = parseInt(k);
            if (v === true && !_.isNaN(idx)) {
              a.push(_this.getOptions()[idx].label);
            }
          }
          if (_this.get('value.other_checkbox') === true) {
            return a.push(_this.get('value.other'));
          }
        };
      })(this));
      return values.join(' ');
    },
    hasValue: function() {
      return this.hasAnyValueInHash();
    }
  });

  FormRenderer.Models.ResponseFieldRadio = FormRenderer.Models.ResponseField.extend({
    field_type: 'radio',
    setExistingValue: function(x) {
      var defaultOption;
      if (x != null ? x.selected : void 0) {
        return this.set('value', x);
      } else if ((defaultOption = _.find(this.getOptions(), (function(option) {
        return _.toBoolean(option.checked);
      })))) {
        return this.set('value.selected', defaultOption.label);
      } else {
        return this.set('value', {});
      }
    },
    getValue: function() {
      return _.tap({
        merge: true
      }, (function(_this) {
        return function(h) {
          h["" + (_this.get('id'))] = _this.get('value.selected');
          return h["" + (_this.get('id')) + "_other"] = _this.get('value.other');
        };
      })(this));
    },
    toText: function() {
      return (this.getValue() || {})["" + this.id];
    },
    hasValue: function() {
      return !!this.get('value.selected');
    }
  });

  FormRenderer.Models.ResponseFieldDropdown = FormRenderer.Models.ResponseField.extend({
    field_type: 'dropdown',
    setExistingValue: function(x) {
      var checkedOption;
      if (x != null) {
        return FormRenderer.Models.ResponseField.prototype.setExistingValue.apply(this, arguments);
      } else {
        checkedOption = _.find(this.getOptions(), (function(option) {
          return _.toBoolean(option.checked);
        }));
        if (!checkedOption && !this.get('field_options.include_blank_option')) {
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

  FormRenderer.Models.ResponseFieldTable = FormRenderer.Models.ResponseField.extend({
    field_type: 'table',
    initialize: function() {
      FormRenderer.Models.ResponseField.prototype.initialize.apply(this, arguments);
      if (this.get('field_options.column_totals')) {
        return this.listenTo(this, 'change:value.*', this.calculateColumnTotals);
      }
    },
    canAddRows: function() {
      return this.numRows < this.maxRows();
    },
    minRows: function() {
      return parseInt(this.get('field_options.minrows'), 10) || 0;
    },
    maxRows: function() {
      if (this.get('field_options.maxrows')) {
        return parseInt(this.get('field_options.maxrows'), 10) || Infinity;
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
      return this.set('value', _.tap({}, (function(_this) {
        return function(h) {
          var column, i, j, _i, _ref1, _results;
          _results = [];
          for (i = _i = 0, _ref1 = _this.numRows - 1; 0 <= _ref1 ? _i <= _ref1 : _i >= _ref1; i = 0 <= _ref1 ? ++_i : --_i) {
            _results.push((function() {
              var _j, _len, _name, _ref2, _ref3, _results1;
              _ref2 = this.getColumns();
              _results1 = [];
              for (j = _j = 0, _len = _ref2.length; _j < _len; j = ++_j) {
                column = _ref2[j];
                h[_name = "" + j] || (h[_name] = {});
                _results1.push(h["" + j]["" + i] = this.getPresetValue(column.label, i) || (x != null ? (_ref3 = x[column.label]) != null ? _ref3[i] : void 0 : void 0));
              }
              return _results1;
            }).call(_this));
          }
          return _results;
        };
      })(this)));
    },
    hasValue: function() {
      return _.some(this.get('value'), function(colVals, colNumber) {
        return _.some(colVals, function(v, k) {
          return !!v;
        });
      });
    },
    getPresetValue: function(columnLabel, rowIndex) {
      var _ref;
      return (_ref = this.get("field_options.preset_values." + columnLabel)) != null ? _ref[rowIndex] : void 0;
    },
    getValue: function() {
      var column, i, j, returnValue, _i, _j, _len, _ref, _ref1;
      returnValue = {};
      for (i = _i = 0, _ref = this.numRows - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        _ref1 = this.getColumns();
        for (j = _j = 0, _len = _ref1.length; _j < _len; j = ++_j) {
          column = _ref1[j];
          returnValue[j] || (returnValue[j] = []);
          returnValue[j].push(this.get("value." + j + "." + i) || '');
        }
      }
      return returnValue;
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
        _results.push(this.set("columnTotals." + j, columnSum > 0 ? parseFloat(columnSum.toFixed(10)) : ''));
      }
      return _results;
    }
  });

  FormRenderer.Models.ResponseFieldFile = FormRenderer.Models.ResponseField.extend({
    field_type: 'file',
    getValue: function() {
      return this.get('value.id') || '';
    },
    hasValue: function() {
      return this.hasValueHashKey(['id']);
    },
    getAcceptedExtensions: function() {
      var x;
      if ((x = FormRenderer.FILE_TYPES[this.get('field_options.file_types')])) {
        return _.map(x, function(x) {
          return "." + x;
        });
      }
    }
  });

  FormRenderer.Models.ResponseFieldDate = FormRenderer.Models.ResponseField.extend({
    field_type: 'date',
    validators: [FormRenderer.Validators.DateValidator],
    hasValue: function() {
      return this.hasValueHashKey(['month', 'day', 'year']);
    },
    toText: function() {
      return _.values(_.pick(this.getValue(), 'month', 'day', 'year')).join('/');
    }
  });

  FormRenderer.Models.ResponseFieldEmail = FormRenderer.Models.ResponseField.extend({
    validators: [FormRenderer.Validators.EmailValidator],
    field_type: 'email'
  });

  FormRenderer.Models.ResponseFieldNumber = FormRenderer.Models.ResponseField.extend({
    validators: [FormRenderer.Validators.NumberValidator, FormRenderer.Validators.MinMaxValidator, FormRenderer.Validators.IntegerValidator],
    field_type: 'number'
  });

  FormRenderer.Models.ResponseFieldParagraph = FormRenderer.Models.ResponseField.extend({
    field_type: 'paragraph',
    validators: [FormRenderer.Validators.MinMaxLengthValidator]
  });

  FormRenderer.Models.ResponseFieldPrice = FormRenderer.Models.ResponseField.extend({
    validators: [FormRenderer.Validators.PriceValidator, FormRenderer.Validators.MinMaxValidator],
    field_type: 'price',
    hasValue: function() {
      return this.hasValueHashKey(['dollars', 'cents']);
    },
    toText: function() {
      var raw;
      raw = this.getValue() || {};
      return "" + (raw.dollars || '0') + "." + (raw.cents || '00');
    }
  });

  FormRenderer.Models.ResponseFieldText = FormRenderer.Models.ResponseField.extend({
    field_type: 'text',
    validators: [FormRenderer.Validators.MinMaxLengthValidator]
  });

  FormRenderer.Models.ResponseFieldTime = FormRenderer.Models.ResponseField.extend({
    validators: [FormRenderer.Validators.TimeValidator],
    field_type: 'time',
    hasValue: function() {
      return this.hasValueHashKey(['hours', 'minutes', 'seconds']);
    },
    setExistingValue: function(x) {
      FormRenderer.Models.ResponseField.prototype.setExistingValue.apply(this, arguments);
      if (!(x != null ? x.am_pm : void 0)) {
        return this.set('value.am_pm', 'AM');
      }
    },
    toText: function() {
      var raw;
      raw = this.getValue() || {};
      return "" + (raw.hours || '00') + ":" + (raw.minutes || '00') + ":" + (raw.seconds || '00') + " " + raw.am_pm;
    }
  });

  FormRenderer.Models.ResponseFieldWebsite = FormRenderer.Models.ResponseField.extend({
    field_type: 'website'
  });

  _ref = FormRenderer.NON_INPUT_FIELD_TYPES;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    i = _ref[_i];
    FormRenderer.Models["ResponseField" + (_.str.classify(i))] = FormRenderer.Models.NonInputResponseField.extend({
      field_type: i
    });
  }

}).call(this);

(function() {
  FormRenderer.Views.BottomStatusBar = Backbone.View.extend({
    events: {
      'click [data-js-back]': 'handleBack',
      'click [data-js-continue]': 'handleContinue'
    },
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      return this.listenTo(this.form_renderer.state, 'change:activePage change:hasChanges change:submitting change:hasServerErrors', this.render);
    },
    render: function() {
      this.$el.html(JST['partials/bottom_status_bar'](this));
      return this;
    },
    handleBack: function(e) {
      e.preventDefault();
      return this.form_renderer.activatePage(this.form_renderer.previousPage(), {
        skipValidation: true
      });
    },
    handleContinue: function(e) {
      e.preventDefault();
      if (this.form_renderer.isLastPage() || !this.form_renderer.options.enablePages) {
        return this.form_renderer.submit();
      } else {
        return this.form_renderer.activatePage(this.form_renderer.nextPage());
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Views.ErrorAlertBar = Backbone.View.extend({
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      return this.listenTo(this.form_renderer, 'afterValidate', this.render);
    },
    render: function() {
      this.$el.html(JST['partials/error_alert_bar'](this));
      if (!this.form_renderer.areAllPagesValid()) {
        window.scrollTo(0, this.$el.offset().top - 10);
      }
      return this;
    }
  });

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
        view = new FormRenderer.Views["ResponseField" + (_.str.classify(rf.field_type))]({
          model: rf,
          form_renderer: this.form_renderer
        });
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
    renderViews: function() {
      var view, _i, _len, _ref, _results;
      _ref = this.views;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        _results.push(view.render());
      }
      return _results;
    },
    validate: function() {
      var rf, _i, _len, _ref;
      _ref = _.filter(this.models, (function(rf) {
        return rf.input_field;
      }));
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        rf = _ref[_i];
        rf.validate();
      }
      return this.renderViews();
    }
  });

}).call(this);

(function() {
  FormRenderer.Views.Pagination = Backbone.View.extend({
    events: {
      'click [data-activate-page]': function(e) {
        return this.form_renderer.activatePage($(e.currentTarget).data('activate-page'), {
          skipValidation: true
        });
      }
    },
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      this.listenTo(this.form_renderer.state, 'change:activePage', this.render);
      return this.listenTo(this.form_renderer, 'afterValidate', this.render);
    },
    render: function() {
      this.$el.html(JST['partials/pagination'](this));
      return this;
    }
  });

}).call(this);

(function() {
  var i, _i, _j, _len, _len1, _ref, _ref1;

  FormRenderer.Views.ResponseField = Backbone.View.extend({
    field_type: void 0,
    className: 'fr_response_field',
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      if (this.form_renderer) {
        this.showLabels = this.form_renderer.options.showLabels;
      } else {
        this.showLabels = options.showLabels;
      }
      this.model = options.model;
      return this.$el.addClass("fr_response_field_" + this.field_type);
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
    render: function() {
      this.$el[this.model.getError() ? 'addClass' : 'removeClass']('error');
      this.$el.html(JST['partials/response_field'](this));
      rivets.bind(this.$el, {
        model: this.model
      });
      return this;
    }
  });

  FormRenderer.Views.NonInputResponseField = FormRenderer.Views.ResponseField.extend({
    render: function() {
      this.$el.addClass("fr_response_field_" + this.field_type);
      this.$el.html(JST['partials/non_input_response_field'](this));
      return this;
    }
  });

  FormRenderer.Views.ResponseFieldPrice = FormRenderer.Views.ResponseField.extend({
    field_type: 'price',
    events: {
      'blur [data-rv-input="model.value.cents"]': 'formatCents'
    },
    formatCents: function(e) {
      var cents;
      cents = $(e.target).val();
      if (cents && cents.match(/^\d$/)) {
        return this.model.set('value.cents', "0" + cents);
      }
    }
  });

  FormRenderer.Views.ResponseFieldTable = FormRenderer.Views.ResponseField.extend({
    field_type: 'table',
    events: {
      'click [data-js-add-row]': 'addRow'
    },
    initialize: function() {
      FormRenderer.Views.ResponseField.prototype.initialize.apply(this, arguments);
      return this.on('shown', function() {
        return this.initExpanding();
      });
    },
    render: function() {
      FormRenderer.Views.ResponseField.prototype.render.apply(this, arguments);
      this.initExpanding();
      return this;
    },
    initExpanding: function() {},
    addRow: function() {
      this.model.numRows++;
      return this.render();
    }
  });

  FormRenderer.Views.ResponseFieldFile = FormRenderer.Views.ResponseField.extend({
    field_type: 'file',
    events: {
      'click [data-js-remove]': 'doRemove'
    },
    render: function() {
      FormRenderer.Views.ResponseField.prototype.render.apply(this, arguments);
      this.$el[this.model.hasValue() ? 'addClass' : 'removeClass']('existing');
      this.$input = this.$el.find('input');
      this.$status = this.$el.find('.upload_status');
      this.bindChangeEvent();
      return this;
    },
    bindChangeEvent: function() {
      return this.$input.on('change', $.proxy(this.fileChanged, this));
    },
    fileChanged: function(e) {
      var newFilename, _ref;
      newFilename = ((_ref = e.target.files) != null ? _ref[0] : void 0) != null ? e.target.files[0].name : e.target.value ? e.target.value.replace(/^.+\\/, '') : 'Error reading filename';
      this.model.set('value.filename', newFilename, {
        silent: true
      });
      this.$el.find('.filename').text(newFilename);
      this.$status.text('Uploading...');
      return this.doUpload();
    },
    doUpload: function() {
      var $oldInput, $tmpForm;
      $tmpForm = $("<form method='post' style='display: inline;' />");
      $oldInput = this.$input;
      this.$input = $oldInput.clone().hide().val('').insertBefore($oldInput);
      this.bindChangeEvent();
      $oldInput.appendTo($tmpForm);
      $tmpForm.insertBefore(this.$input);
      this.form_renderer.uploads += 1;
      return $tmpForm.ajaxSubmit({
        url: "" + this.form_renderer.options.screendoorBase + "/api/form_renderer/file",
        data: {
          response_field_id: this.model.get('id'),
          replace_file_id: this.model.get('value.id'),
          v: 0
        },
        dataType: 'json',
        uploadProgress: (function(_this) {
          return function(_, __, ___, percentComplete) {
            return _this.$status.text(percentComplete === 100 ? 'Finishing up...' : "Uploading... (" + percentComplete + "%)");
          };
        })(this),
        complete: (function(_this) {
          return function() {
            _this.form_renderer.uploads -= 1;
            return $tmpForm.remove();
          };
        })(this),
        success: (function(_this) {
          return function(data) {
            _this.model.set('value.id', data.file_id);
            _this.form_renderer.autosaveImmediately();
            return _this.render();
          };
        })(this),
        error: (function(_this) {
          return function(data) {
            var errorText, _ref;
            errorText = (_ref = data.responseJSON) != null ? _ref.errors : void 0;
            _this.$status.text(errorText ? "Error: " + errorText : 'Error');
            _this.$status.addClass('is_error');
            return setTimeout(function() {
              return _this.render();
            }, 2000);
          };
        })(this)
      });
    },
    doRemove: function() {
      this.model.set('value', {});
      this.form_renderer.autosaveImmediately();
      return this.render();
    }
  });

  FormRenderer.Views.ResponseFieldMapMarker = FormRenderer.Views.ResponseField.extend({
    field_type: 'map_marker',
    events: {
      'click .fr_map_cover': 'enable',
      'click [data-js-clear]': 'disable'
    },
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
      return this.model.set({
        value: {
          lat: center.lat.toFixed(7),
          lng: center.lng.toFixed(7)
        }
      });
    },
    enable: function() {
      this.map.addLayer(this.marker);
      this.$cover.hide();
      return this._onMove();
    },
    disable: function() {
      this.map.removeLayer(this.marker);
      this.$el.find('.fr_map_cover').show();
      return this.model.set({
        value: {
          lat: '',
          lng: ''
        }
      });
    }
  });

  _ref = _.without(FormRenderer.INPUT_FIELD_TYPES, 'table', 'file', 'map_marker', 'price');
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    i = _ref[_i];
    FormRenderer.Views["ResponseField" + (_.str.classify(i))] = FormRenderer.Views.ResponseField.extend({
      field_type: i
    });
  }

  _ref1 = FormRenderer.NON_INPUT_FIELD_TYPES;
  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
    i = _ref1[_j];
    FormRenderer.Views["ResponseField" + (_.str.classify(i))] = FormRenderer.Views.NonInputResponseField.extend({
      field_type: i
    });
  }

}).call(this);

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
      var format, k, v;
    
      format = this.model.get('field_options.address_format');
    
      _print(_safe('\n\n'));
    
      if (format !== 'city_state' && format !== 'city_state_zip' && format !== 'country') {
        _print(_safe('\n  <div class=\'fr_input_grid\'>\n    <div class=\'fr_item_full\'>\n      <label class="fr_sub_label">Address</label>\n      <input type="text"\n             id="'));
        _print(this.getDomId());
        _print(_safe('"\n             data-rv-input=\'model.value.street\' />\n    </div>\n  </div>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (format !== 'country') {
        _print(_safe('\n  <div class=\'fr_input_grid\'>\n    <div class=\'fr_item_half\'>\n      <label class="fr_sub_label">City</label>\n      <input type="text"\n             data-rv-input=\'model.value.city\' />\n    </div>\n\n    <div class=\'fr_item_half\'>\n      <label class="fr_sub_label">State / Province / Region</label>\n      <input type="text"\n             data-rv-input=\'model.value.state\' />\n    </div>\n  </div>\n'));
      }
    
      _print(_safe('\n\n<div class=\'fr_input_grid\'>\n  '));
    
      if (format !== 'city_state' && format !== 'country') {
        _print(_safe('\n    <div class=\'fr_item_half\'>\n      <label class="fr_sub_label">ZIP Code</label>\n      <input type="text"\n             data-rv-input=\'model.value.zipcode\' />\n    </div>\n  '));
      }
    
      _print(_safe('\n\n  '));
    
      if (format !== 'city_state' && format !== 'city_state_zip') {
        _print(_safe('\n    <div class=\'fr_item_half\'>\n      <label class="fr_sub_label">Country</label>\n      <select data-rv-value=\'model.value.country\' data-width=\'auto\'>\n        '));
        for (k in ISOCountryNames) {
          v = ISOCountryNames[k];
          _print(_safe('\n          <option value=\''));
          _print(k);
          _print(_safe('\'>'));
          _print(v);
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
      _print(_safe('<div class=\'size_'));
    
      _print(this.model.get('field_options.size'));
    
      _print(_safe('\'>\n  '));
    
      _print(_safe(_.sanitize(_.simpleFormat(this.model.get('field_options.description'), false))));
    
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
      var i, option, _i, _len, _ref;
    
      _ref = this.model.getOptions();
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        option = _ref[i];
        _print(_safe('\n  <label class=\'fr_option control\'>\n    <input type=\'checkbox\' data-rv-checked=\'model.value.'));
        _print(i);
        _print(_safe('\' />\n    '));
        _print(option.label);
        _print(_safe('\n  </label>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (this.model.get('field_options.include_other_option')) {
        _print(_safe('\n  <div class=\'fr_option fr_other_option\'>\n    <label class=\'control\'>\n      <input type=\'checkbox\' data-rv-checked=\'model.value.other_checkbox\' />\n      Other\n    </label>\n\n    <input type=\'text\' data-rv-input=\'model.value.other\' />\n  </div>\n'));
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
      _print(_safe('<div class=\'fr_input_grid\'>\n  <div class=\'fr_item_auto\'>\n    <label class="fr_sub_label">MM</label>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n           data-rv-input=\'model.value.month\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_item_spacer\'>/</div>\n\n  <div class=\'fr_item_auto\'>\n    <label class="fr_sub_label">DD</label>\n    <input type="text"\n           data-rv-input=\'model.value.day\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_item_spacer\'>/</div>\n\n  <div class=\'fr_item_auto\'>\n    <label class="fr_sub_label">YYYY</label>\n    <input type="text"\n           data-rv-input=\'model.value.year\'\n           maxlength=\'4\'\n           size=\'4\' />\n  </div>\n</div>\n'));
    
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
    
      if (this.model.get('field_options.include_blank_option')) {
        _print(_safe('\n    <option></option>\n  '));
      }
    
      _print(_safe('\n\n  '));
    
      _ref = this.model.getOptions();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        _print(_safe('\n    <option value="'));
        _print(option.label);
        _print(_safe('">'));
        _print(option.label);
        _print(_safe('</option>\n  '));
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
      var exts;
    
      _print(_safe('<div class=\'existing\'>\n  <span class=\'filename\'>'));
    
      _print(this.model.get('value.filename'));
    
      _print(_safe('</span>\n  <button data-js-remove class=\''));
    
      _print(FormRenderer.BUTTON_CLASS);
    
      _print(_safe('\'>Remove</button>\n</div>\n\n<div class=\'not_existing\'>\n  <input type=\'file\'\n         id=\''));
    
      _print(this.getDomId());
    
      _print(_safe('\'\n         name=\'file\'\n         '));
    
      if ((exts = this.model.getAcceptedExtensions())) {
        _print(_safe('\n          accept=\''));
        _print(exts.join(','));
        _print(_safe('\'\n         '));
      }
    
      _print(_safe('\n         />\n  <span class=\'upload_status\'></span>\n\n  '));
    
      if ((exts = this.model.getAcceptedExtensions())) {
        _print(_safe('\n    <div class=\'file_type_help\'>\n      We\'ll accept '));
        _print(_.str.toSentence(exts));
        _print(_safe('\n    </div>\n  '));
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
      _print(_safe('<div class=\'fr_input_grid\'>\n  <div class=\'fr_item_full lap_fr_item_half\'>\n    <label for=\''));
    
      _print(this.getDomId());
    
      _print(_safe('-name\'>Name <abbr title=\'required\'>*</abbr></label>\n    <input type=\'text\'\n           id=\''));
    
      _print(this.getDomId());
    
      _print(_safe('-name\'\n           data-rv-input=\'model.value.name\' />\n  </div>\n\n  <div class=\'fr_item_full lap_fr_item_half\'>\n    <label for=\''));
    
      _print(this.getDomId());
    
      _print(_safe('-email\'>Email <abbr title=\'required\'>*</abbr></label>\n    <input type="text"\n           id=\''));
    
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
      _print(_safe('<div class=\'fr_map_wrapper\'>\n  <div class=\'fr_map_map\' />\n\n  <div class=\'fr_map_cover\'>\n    Click to set location\n  </div>\n\n  <div class=\'fr_map_toolbar fr_cf\'>\n    <strong>Coordinates:</strong>\n    <span data-rv-show=\'model.value.lat\'>\n      <span data-rv-text=\'model.value.lat\' />,\n      <span data-rv-text=\'model.value.lng\' />\n    </span>\n    <span data-rv-hide=\'model.value.lat\' class=\'fr_map_no_location\'>N/A</span>\n    <a data-js-clear data-rv-show=\'model.value.lat\' href=\'javascript:void(0);\'>Clear</a>\n  </div>\n</div>\n'));
    
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
    
      _print(_safe('"\n       data-rv-input=\'model.value\' />\n\n'));
    
      if (this.model.get('field_options.units')) {
        _print(_safe('\n  <span class=\'units\'>\n    '));
        _print(this.model.get('field_options.units'));
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
    
      _print(this.model.get('field_options.size'));
    
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
      _print(_safe('<div class=\'fr_input_grid\'>\n  <div class=\'fr_item_spacer\'>$</div>\n\n  <div class=\'fr_item_auto\'>\n    <label class="fr_sub_label">Dollars</label>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n           data-rv-input=\'model.value.dollars\'\n           size=\'6\' />\n  </div>\n\n  '));
    
      if (!this.model.get('field_options.disable_cents')) {
        _print(_safe('\n    <div class=\'fr_item_spacer\'>.</div>\n    <div class=\'fr_item_auto\'>\n      <label class="fr_sub_label">Cents</label>\n      <input type="text"\n             data-rv-input=\'model.value.cents\'\n             maxlength=\'2\'\n             size=\'2\' />\n    </div>\n  '));
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
      var i, option, _i, _len, _ref;
    
      _ref = this.model.getOptions();
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        option = _ref[i];
        _print(_safe('\n  <label class=\'fr_option control\'>\n    <input type=\'radio\'\n           data-rv-checked=\'model.value.selected\'\n           id="'));
        _print(this.getDomId());
        _print(_safe('"\n           name="'));
        _print(this.getDomId());
        _print(_safe('"\n           value="'));
        _print(option.label);
        _print(_safe('" />\n    '));
        _print(option.label);
        _print(_safe('\n  </label>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (this.model.get('field_options.include_other_option')) {
        _print(_safe('\n  <div class=\'fr_option fr_other_option\'>\n    <label class=\'control\'>\n      <input type=\'radio\'\n             data-rv-checked=\'model.value.selected\'\n             id="'));
        _print(this.getDomId());
        _print(_safe('"\n             name="'));
        _print(this.getDomId());
        _print(_safe('"\n             value="Other" />\n      Other\n    </label>\n\n    <input type=\'text\' data-rv-input=\'model.value.other\' />\n  </div>\n'));
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
      _print(_safe('<div class=\'size_'));
    
      _print(this.model.get('field_options.size'));
    
      _print(_safe('\'>\n  <div class=\'fr_section_name\'>'));
    
      _print(this.model.get('label'));
    
      _print(_safe('</div>\n  '));
    
      if (this.model.get('field_options.description')) {
        _print(_safe('\n    <p>'));
        _print(_safe(_.sanitize(_.simpleFormat(this.model.get('field_options.description'), false))));
        _print(_safe('</p>\n  '));
      }
    
      _print(_safe('\n</div>\n\n<hr />\n'));
    
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
        _print(column.label);
        _print(_safe('</th>\n      '));
      }
    
      _print(_safe('\n    </tr>\n  </thead>\n\n  <tbody>\n    '));
    
      for (i = _j = 0, _ref1 = this.model.numRows - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
        _print(_safe('\n      <tr>\n        '));
        _ref2 = this.model.getColumns();
        for (j = _k = 0, _len1 = _ref2.length; _k < _len1; j = ++_k) {
          column = _ref2[j];
          _print(_safe('\n          <td>\n            <textarea '));
          if (this.model.getPresetValue(column.label, i)) {
            _print(_safe('readonly'));
          }
          _print(_safe('\n                      data-col=\''));
          _print(j);
          _print(_safe('\'\n                      data-row=\''));
          _print(i);
          _print(_safe('\'\n                      data-rv-input=\'model.value.'));
          _print(j);
          _print(_safe('.'));
          _print(i);
          _print(_safe('\'\n                      rows=\'1\' />\n          </td>\n        '));
        }
        _print(_safe('\n      </tr>\n    '));
      }
    
      _print(_safe('\n  </tbody>\n\n  '));
    
      if (this.model.get('field_options.column_totals')) {
        _print(_safe('\n    <tfoot>\n      <tr>\n        '));
        _ref3 = this.model.getColumns();
        for (j = _l = 0, _len2 = _ref3.length; _l < _len2; j = ++_l) {
          column = _ref3[j];
          _print(_safe('\n          <td data-rv-text=\'model.columnTotals.'));
          _print(j);
          _print(_safe('\'></td>\n        '));
        }
        _print(_safe('\n      </tr>\n    </tfoot>\n  '));
      }
    
      _print(_safe('\n</table>\n\n<div class=\'fr_table_add_row_wrapper\'>\n  '));
    
      if (this.model.canAddRows()) {
        _print(_safe('\n    '));
        _print(_safe(JST["partials/add_row_link"](this)));
        _print(_safe('\n  '));
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
    
      _print(this.model.get('field_options.size'));
    
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
      _print(_safe('<div class=\'fr_input_grid\'>\n  <div class=\'fr_item_auto\'>\n    <label class="fr_sub_label">HH</label>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n           data-rv-input=\'model.value.hours\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_item_spacer\'>:</div>\n\n  <div class=\'fr_item_auto\'>\n    <label class="fr_sub_label">MM</label>\n    <input type="text"\n           data-rv-input=\'model.value.minutes\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  '));
    
      if (!this.model.get('field_options.disable_seconds')) {
        _print(_safe('\n    <div class=\'fr_item_spacer\'>:</div>\n\n    <div class=\'fr_item_auto\'>\n      <label class="fr_sub_label">SS</label>\n      <input type="text"\n             data-rv-input=\'model.value.seconds\'\n             maxlength=\'2\'\n             size=\'2\' />\n    </div>\n  '));
      }
    
      _print(_safe('\n\n  <div class=\'fr_item_spacer\'>\n    <select data-rv-value=\'model.value.am_pm\' data-width=\'auto\'>\n      <option value=\'AM\'>AM</option>\n      <option value=\'PM\'>PM</option>\n    </select>\n  </div>\n</div>\n'));
    
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
      _print(_safe('<div class=\'fr_loading\'>\n  Loading form...\n</div>'));
    
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
window.JST["partials/add_row_link"] = function(__obj) {
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
      _print(_safe('<a data-js-add-row href=\'javascript:void(0)\'>+ Add another row</a>\n'));
    
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
window.JST["partials/bottom_status_bar"] = function(__obj) {
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
      _print(_safe('<div class=\'fr_bottom_bar fr_cf\'>\n  '));
    
      if (this.form_renderer.options.enableAutosave) {
        _print(_safe('\n    <div class=\'fr_bottom_bar_l\'>\n      '));
        if (this.form_renderer.state.get('hasServerErrors')) {
          _print(_safe('\n        Error saving\n      '));
        } else if (this.form_renderer.state.get('hasChanges')) {
          _print(_safe('\n        Saving...\n      '));
        } else {
          _print(_safe('\n        Saved\n      '));
        }
        _print(_safe('\n    </div>\n  '));
      }
    
      _print(_safe('\n\n  <div class=\'fr_bottom_bar_r\'>\n    '));
    
      if (!this.form_renderer.isFirstPage()) {
        _print(_safe('\n      <button data-js-back class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>\n        Back to page '));
        _print(this.form_renderer.previousPage());
        _print(_safe('\n      </button>\n    '));
      }
    
      _print(_safe('\n\n    '));
    
      if (this.form_renderer.state.get('submitting')) {
        _print(_safe('\n      <button disabled class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>\n        Submitting...\n      </button>\n    '));
      } else {
        _print(_safe('\n      <button data-js-continue class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>\n        '));
        if (this.form_renderer.isLastPage() || !this.form_renderer.options.enablePages) {
          _print(_safe('Submit'));
        } else {
          _print(_safe('Next page'));
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
      if (this.model.get('field_options.description')) {
        _print(_safe('\n  <div class=\'fr_description\'>\n    '));
        _print(_safe(_.sanitize(_.simpleFormat(this.model.get('field_options.description'), false))));
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
      if (this.model.getError()) {
        _print(_safe('\n  <div class=\'fr_error\'>\n    '));
        _print(this.model.getError());
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
window.JST["partials/error_alert_bar"] = function(__obj) {
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
        _print(_safe('\n  <div class=\'fr_error_alert_bar\'>Your response has validation errors.</div>\n'));
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
      _print(_safe('<label for="'));
    
      _print(this.getDomId());
    
      _print(_safe('">\n  '));
    
      _print(this.model.get('label'));
    
      _print(_safe('\n  '));
    
      if (this.model.get('required')) {
        _print(_safe('<abbr title=\'required\'>*</abbr>'));
      }
    
      _print(_safe('\n\n  '));
    
      if (this.showLabels) {
        _print(_safe('\n    '));
        if (this.model.get('blind')) {
          _print(_safe('\n      <span class=\'label\'>Blind</span>\n    '));
        }
        _print(_safe('\n    '));
        if (this.model.get('admin_only')) {
          _print(_safe('\n      <span class=\'label\'>Hidden</span>\n    '));
        }
        _print(_safe('\n  '));
      }
    
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
      if (this.model.hasLengthValidations()) {
        _print(_safe('\n  <div class=\'fr_min_max\'>\n    '));
        if (this.model.get('field_options.minlength') && this.model.get('field_options.maxlength')) {
          _print(_safe('\n      Between '));
          _print(this.model.get('field_options.minlength'));
          _print(_safe(' and '));
          _print(this.model.get('field_options.maxlength'));
          _print(_safe(' '));
          _print(this.model.getLengthValidationUnits());
          _print(_safe('.\n    '));
        } else if (this.model.get('field_options.minlength')) {
          _print(_safe('\n      More than '));
          _print(this.model.get('field_options.minlength'));
          _print(_safe(' '));
          _print(this.model.getLengthValidationUnits());
          _print(_safe('.\n    '));
        } else if (this.model.get('field_options.maxlength')) {
          _print(_safe('\n      Less than '));
          _print(this.model.get('field_options.maxlength'));
          _print(_safe(' '));
          _print(this.model.getLengthValidationUnits());
          _print(_safe('.\n    '));
        }
        _print(_safe('\n\n    Current count:\n    <code class=\'fr_min_max_counter\' data-rv-text=\'model.currentLength\'></code>\n    '));
        _print(this.model.getLengthValidationUnits());
        _print(_safe('.\n  </div>\n'));
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
      if (this.model.hasMinMaxValidations()) {
        _print(_safe('\n  <div class=\'fr_min_max\'>\n    '));
        if (this.model.get('field_options.min') && this.model.get('field_options.max')) {
          _print(_safe('\n      Between '));
          _print(this.model.get('field_options.min'));
          _print(_safe(' and '));
          _print(this.model.get('field_options.max'));
          _print(_safe('.\n    '));
        } else if (this.model.get('field_options.min')) {
          _print(_safe('\n      More than '));
          _print(this.model.get('field_options.min'));
          _print(_safe('.\n    '));
        } else if (this.model.get('field_options.max')) {
          _print(_safe('\n      Less than '));
          _print(this.model.get('field_options.max'));
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
      _print(_safe(JST["fields/" + this.field_type](this)));
    
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
        _print(_safe('\n  <ul class=\'fr_pagination fr_cf\'>\n    '));
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
            _print(_safe('" href=\'javascript:void(0)\'>\n            '));
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
      _print(_safe(JST["partials/label"](this)));
    
      _print(_safe('\n'));
    
      _print(_safe(JST["fields/" + this.field_type](this)));
    
      _print(_safe('\n\n<div class=\'fr_clear\' />\n\n'));
    
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
