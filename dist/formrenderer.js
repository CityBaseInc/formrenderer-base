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
  var FormRenderer,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  window.FormRenderer = FormRenderer = (function(_super) {
    __extends(FormRenderer, _super);

    FormRenderer.INPUT_FIELD_TYPES = ['address', 'checkboxes', 'date', 'dropdown', 'email', 'file', 'number', 'paragraph', 'price', 'radio', 'table', 'text', 'time', 'website', 'map_marker'];

    FormRenderer.NON_INPUT_FIELD_TYPES = ['block_of_text', 'page_break', 'section_break'];

    FormRenderer.FIELD_TYPES = _.union(FormRenderer.INPUT_FIELD_TYPES, FormRenderer.NON_INPUT_FIELD_TYPES);

    FormRenderer.Views = {};

    FormRenderer.Models = {};

    FormRenderer.Validators = {};

    FormRenderer.prototype.defaults = {
      url: '/responses/save',
      target: '#form',
      afterSubmit: void 0,
      validateImmediately: false,
      response_fields: [],
      response: {
        id: void 0,
        responses: {}
      },
      project_id: void 0,
      ignore_user: void 0,
      edit_in_place: false
    };

    FormRenderer.prototype.events = {
      'click [data-activate-page]': function(e) {
        return this.activatePage($(e.currentTarget).data('activate-page'), {
          silent: true
        });
      }
    };

    function FormRenderer(options) {
      this.options = $.extend({}, this.defaults, options);
      this.state = new Backbone.Model;
      this.state.set('hasChanges', false);
      this.setElement($(this.options.target));
      this.$el.html('');
      this.$el.addClass('form_renderer_form');
      this.$el.data('form-renderer', this);
      this.subviews = {
        pages: {}
      };
      this.constructResponseFields(this.options.response_fields);
      this.constructPages();
      this.constructPagination();
      this.constructBottomStatusBar();
      this.constructErrorAlertBar();
      this.subviews.pages[this.state.get('activePage')].show();
      this.initAutosave();
      this.initBeforeUnload();
      if (this.options.validateImmediately) {
        this.validateAllPages();
      }
    }

    FormRenderer.prototype.constructResponseFields = function(responseFieldsJSON) {
      var model, rf, _i, _len;
      this.response_fields = new FormRenderer.Collection;
      for (_i = 0, _len = responseFieldsJSON.length; _i < _len; _i++) {
        rf = responseFieldsJSON[_i];
        model = new FormRenderer.Models["ResponseField" + (_.str.classify(rf.field_type))](rf);
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
    };

    FormRenderer.prototype.validateCurrentPage = function() {
      this.trigger("beforeValidate beforeValidate:" + (this.state.get('activePage')));
      this.subviews.pages[this.state.get('activePage')].validate();
      this.trigger("afterValidate afterValidate:" + (this.state.get('activePage')));
      return this.isPageValid(this.state.get('activePage'));
    };

    FormRenderer.prototype.validateAllPages = function() {
      var page, pageNumber, _ref;
      this.trigger('beforeValidate beforeValidate:all');
      _ref = this.subviews.pages;
      for (pageNumber in _ref) {
        page = _ref[pageNumber];
        page.validate();
      }
      this.trigger('afterValidate afterValidate:all');
      return this.areAllPagesValid();
    };

    FormRenderer.prototype.isPageValid = function(pageNumber) {
      return !_.find(this.subviews.pages[pageNumber].models, (function(rf) {
        return rf.input_field && rf.errors.length > 0;
      }));
    };

    FormRenderer.prototype.areAllPagesValid = function() {
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
    };

    FormRenderer.prototype.numValidationErrors = function() {
      return this.response_fields.filter(function(rf) {
        return rf.input_field && rf.errors.length > 0;
      }).length;
    };

    FormRenderer.prototype.constructPages = function() {
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
    };

    FormRenderer.prototype.constructPagination = function() {
      this.subviews.pagination = new FormRenderer.Views.Pagination({
        form_renderer: this
      });
      return this.$el.prepend(this.subviews.pagination.render().el);
    };

    FormRenderer.prototype.constructBottomStatusBar = function() {
      this.subviews.bottomStatusBar = new FormRenderer.Views.BottomStatusBar({
        form_renderer: this
      });
      return this.$el.append(this.subviews.bottomStatusBar.render().el);
    };

    FormRenderer.prototype.constructErrorAlertBar = function() {
      this.subviews.errorAlertBar = new FormRenderer.Views.ErrorAlertBar({
        form_renderer: this
      });
      return this.$el.prepend(this.subviews.errorAlertBar.render().el);
    };

    FormRenderer.prototype.activatePage = function(newPageNumber, opts) {
      if (opts == null) {
        opts = {};
      }
      if (!(opts.silent || this.validateCurrentPage())) {
        return;
      }
      this.subviews.pages[this.state.get('activePage')].hide();
      this.subviews.pages[newPageNumber].show();
      return this.state.set('activePage', newPageNumber);
    };

    FormRenderer.prototype.getValue = function() {
      return _.tap({}, (function(_this) {
        return function(h) {
          return _this.response_fields.each(function(rf) {
            var gotValue;
            if (!rf.input_field) {
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
    };

    FormRenderer.prototype.saveParams = function() {
      return {
        response_id: this.options.response.id,
        project_id: this.options.project_id,
        edit_in_place: this.options.edit_in_place,
        ignore_user: this.options.ignore_user,
        background_submit: true
      };
    };

    FormRenderer.prototype.save = function(options) {
      if (options == null) {
        options = {};
      }
      this.isSaving = true;
      return $.ajax({
        url: this.options.url,
        type: 'post',
        dataType: 'json',
        data: _.extend(this.saveParams(), {
          raw_responses: this.getValue()
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
            _this.state.set('hasChanges', false);
            _this.state.set('hasServerErrors', false);
            _this.options.response.id = data.response_id;
            return (_ref = options.success) != null ? _ref.apply(_this, arguments) : void 0;
          };
        })(this),
        error: (function(_this) {
          return function() {
            var _ref;
            _this.state.set('hasServerErrors', true);
            _this.state.set('submitting', false);
            return (_ref = options.error) != null ? _ref.apply(_this, arguments) : void 0;
          };
        })(this)
      });
    };

    FormRenderer.prototype.initAutosave = function() {
      return setInterval((function(_this) {
        return function() {
          if (_this.state.get('hasChanges') && !_this.isSaving) {
            return _this.save();
          }
        };
      })(this), 5000);
    };

    FormRenderer.prototype.initBeforeUnload = function() {
      return BeforeUnload.enable((function(_this) {
        return function() {
          return _this.state.get('hasChanges');
        };
      })(this), 'You have unsaved changes. Are you sure you want to leave this page?');
    };

    FormRenderer.prototype.submit = function(opts) {
      var afterSubmit, cb;
      if (opts == null) {
        opts = {};
      }
      if (!(opts.silent || this.validateAllPages())) {
        return;
      }
      afterSubmit = opts.afterSubmit || this.options.afterSubmit;
      this.state.set('submitting', true);
      if (typeof afterSubmit === 'function') {
        cb = afterSubmit;
      } else if (typeof afterSubmit === 'string') {
        cb = (function(_this) {
          return function() {
            return window.location = afterSubmit;
          };
        })(this);
      } else {
        cb = (function(_this) {
          return function() {
            return console.log('[FormRenderer] Not sure what to do...');
          };
        })(this);
      }
      if (this.state.get('hasChanges')) {
        return this.save({
          success: cb
        });
      } else {
        return cb.apply(this);
      }
    };

    return FormRenderer;

  })(Backbone.View);

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Collection = (function(_super) {
    __extends(Collection, _super);

    function Collection() {
      return Collection.__super__.constructor.apply(this, arguments);
    }

    return Collection;

  })(Backbone.Collection);

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
      var count;
      if (!(this.model.get('field_options.minlength') || this.model.get('field_options.maxlength'))) {
        return;
      }
      this.min = parseInt(this.model.get('field_options.minlength'), 10) || void 0;
      this.max = parseInt(this.model.get('field_options.maxlength'), 10) || void 0;
      count = this.model.get('field_options.min_max_length_units') === 'words' ? this.countWords() : this.countCharacters();
      if (this.min && count < this.min) {
        return 'is too short';
      } else if (this.max && count > this.max) {
        return 'is too long';
      }
    };

    MinMaxLengthValidator.prototype.countWords = function() {
      return (_.trim(this.model.get('value')).replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || '').length;
    };

    MinMaxLengthValidator.prototype.countCharacters = function() {
      return _.trim(this.model.get('value')).replace(/\s/g, '').length;
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
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FormRenderer.Models.ResponseField = (function(_super) {
    __extends(ResponseField, _super);

    function ResponseField() {
      return ResponseField.__super__.constructor.apply(this, arguments);
    }

    ResponseField.prototype.input_field = true;

    ResponseField.prototype.field_type = void 0;

    ResponseField.prototype.validators = [];

    ResponseField.prototype.sync = function() {};

    ResponseField.prototype.initialize = function() {
      this.errors = [];
      if (this.hasLengthValidations()) {
        return this.listenTo(this, 'change:value', this.calculateLength);
      }
    };

    ResponseField.prototype.validate = function() {
      var newError, v, validator, validatorName, _ref, _results;
      this.errors = [];
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
    };

    ResponseField.prototype.getError = function() {
      if (this.errors.length > 0) {
        return this.errors.join('. ');
      }
    };

    ResponseField.prototype.hasLengthValidations = function() {
      return this.get('field_options.minlength') || this.get('field_options.maxlength');
    };

    ResponseField.prototype.calculateLength = function() {
      var v;
      v = new FormRenderer.Validators.MinMaxLengthValidator(this);
      return this.set('currentLength', v[this.getLengthValidationUnits() === 'words' ? 'countWords' : 'countCharacters']());
    };

    ResponseField.prototype.hasMinMaxValidations = function() {
      return this.get('field_options.min') || this.get('field_options.max');
    };

    ResponseField.prototype.getLengthValidationUnits = function() {
      return this.get('field_options.min_max_length_units') || 'characters';
    };

    ResponseField.prototype.setExistingValue = function(x) {
      if (x) {
        this.set('value', x);
      }
      if (this.hasLengthValidations()) {
        return this.calculateLength();
      }
    };

    ResponseField.prototype.getValue = function() {
      return this.get('value');
    };

    ResponseField.prototype.hasValue = function() {
      return !!this.get('value');
    };

    ResponseField.prototype.hasAnyValueInHash = function() {
      return _.some(this.get('value'), function(v, k) {
        return !!v;
      });
    };

    ResponseField.prototype.hasValueHashKey = function(keys) {
      return _.some(keys, (function(_this) {
        return function(key) {
          return !!_this.get("value." + key);
        };
      })(this));
    };

    ResponseField.prototype.getOptions = function() {
      return this.get('field_options.options') || [];
    };

    ResponseField.prototype.getColumns = function() {
      return this.get('field_options.columns') || [];
    };

    ResponseField.prototype.columnOrOptionKeypath = function() {
      if (this.field_type === 'table') {
        return 'field_options.columns';
      } else {
        return 'field_options.options';
      }
    };

    ResponseField.prototype.addOptionOrColumnAtIndex = function(i) {
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
    };

    ResponseField.prototype.removeOptionOrColumnAtIndex = function(i) {
      var opts;
      opts = this.get(this.columnOrOptionKeypath());
      opts.splice(i, 1);
      this.set(this.columnOrOptionKeypath(), opts);
      return this.trigger('change');
    };

    return ResponseField;

  })(Backbone.DeepModel);

  FormRenderer.Models.NonInputResponseField = (function(_super) {
    __extends(NonInputResponseField, _super);

    function NonInputResponseField() {
      return NonInputResponseField.__super__.constructor.apply(this, arguments);
    }

    NonInputResponseField.prototype.input_field = false;

    NonInputResponseField.prototype.field_type = void 0;

    NonInputResponseField.prototype.sync = function() {};

    return NonInputResponseField;

  })(Backbone.DeepModel);

  FormRenderer.Models.ResponseFieldMapMarker = (function(_super) {
    __extends(ResponseFieldMapMarker, _super);

    function ResponseFieldMapMarker() {
      return ResponseFieldMapMarker.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldMapMarker.prototype.field_type = 'map_marker';

    ResponseFieldMapMarker.prototype.hasValue = function() {
      return _.every(['lat', 'lng'], (function(_this) {
        return function(key) {
          return !!_this.get("value." + key);
        };
      })(this));
    };

    ResponseFieldMapMarker.prototype.latLng = function() {
      if (this.hasValue()) {
        return [this.get('value.lat'), this.get('value.lng')];
      }
    };

    ResponseFieldMapMarker.prototype.defaultLatLng = function() {
      var lat, lng;
      if ((lat = this.get('field_options.default_lat')) && (lng = this.get('field_options.default_lng'))) {
        return [lat, lng];
      }
    };

    return ResponseFieldMapMarker;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldAddress = (function(_super) {
    __extends(ResponseFieldAddress, _super);

    function ResponseFieldAddress() {
      return ResponseFieldAddress.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldAddress.prototype.field_type = 'address';

    ResponseFieldAddress.prototype.setExistingValue = function(x) {
      ResponseFieldAddress.__super__.setExistingValue.apply(this, arguments);
      if (!(x != null ? x.country : void 0)) {
        return this.set('value.country', 'US');
      }
    };

    ResponseFieldAddress.prototype.hasValue = function() {
      return this.hasValueHashKey(['street', 'city', 'state', 'zipcode']);
    };

    return ResponseFieldAddress;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldCheckboxes = (function(_super) {
    __extends(ResponseFieldCheckboxes, _super);

    function ResponseFieldCheckboxes() {
      return ResponseFieldCheckboxes.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldCheckboxes.prototype.field_type = 'checkboxes';

    ResponseFieldCheckboxes.prototype.setExistingValue = function(x) {
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
    };

    ResponseFieldCheckboxes.prototype.getValue = function() {
      var k, returnValue, v, _ref;
      returnValue = {};
      _ref = this.get('value');
      for (k in _ref) {
        v = _ref[k];
        returnValue[k] = v === true ? 'on' : v;
      }
      return returnValue;
    };

    ResponseFieldCheckboxes.prototype.hasValue = function() {
      return this.hasAnyValueInHash();
    };

    return ResponseFieldCheckboxes;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldRadio = (function(_super) {
    __extends(ResponseFieldRadio, _super);

    function ResponseFieldRadio() {
      return ResponseFieldRadio.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldRadio.prototype.field_type = 'radio';

    ResponseFieldRadio.prototype.setExistingValue = function(x) {
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
    };

    ResponseFieldRadio.prototype.getValue = function() {
      return _.tap({
        merge: true
      }, (function(_this) {
        return function(h) {
          h["" + (_this.get('id'))] = _this.get('value.selected');
          return h["" + (_this.get('id')) + "_other"] = _this.get('value.other');
        };
      })(this));
    };

    ResponseFieldRadio.prototype.hasValue = function() {
      return !!this.get('value.selected');
    };

    return ResponseFieldRadio;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldDropdown = (function(_super) {
    __extends(ResponseFieldDropdown, _super);

    function ResponseFieldDropdown() {
      return ResponseFieldDropdown.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldDropdown.prototype.field_type = 'dropdown';

    ResponseFieldDropdown.prototype.setExistingValue = function(x) {
      var checkedOption;
      if (x != null) {
        return ResponseFieldDropdown.__super__.setExistingValue.apply(this, arguments);
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
    };

    return ResponseFieldDropdown;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldTable = (function(_super) {
    __extends(ResponseFieldTable, _super);

    function ResponseFieldTable() {
      return ResponseFieldTable.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldTable.prototype.field_type = 'table';

    ResponseFieldTable.prototype.initialize = function() {
      ResponseFieldTable.__super__.initialize.apply(this, arguments);
      if (this.get('field_options.column_totals')) {
        return this.listenTo(this, 'change:value.*', this.calculateColumnTotals);
      }
    };

    ResponseFieldTable.prototype.setExistingValue = function(x) {
      var firstColumnLength, minRows, _ref;
      firstColumnLength = ((_ref = _.find(x, (function() {
        return true;
      }))) != null ? _ref.length : void 0) || 0;
      minRows = parseInt(this.get('field_options.minrows'), 10) || 0;
      this.numRows = Math.max(minRows, firstColumnLength, 1);
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
    };

    ResponseFieldTable.prototype.hasValue = function() {
      return _.some(this.get('value'), function(colVals, colNumber) {
        return _.some(colVals, function(v, k) {
          return !!v;
        });
      });
    };

    ResponseFieldTable.prototype.getPresetValue = function(columnLabel, rowIndex) {
      var _ref;
      return (_ref = this.get("field_options.preset_values." + columnLabel)) != null ? _ref[rowIndex] : void 0;
    };

    ResponseFieldTable.prototype.getValue = function() {
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
    };

    ResponseFieldTable.prototype.calculateColumnTotals = function() {
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
    };

    return ResponseFieldTable;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldFile = (function(_super) {
    __extends(ResponseFieldFile, _super);

    function ResponseFieldFile() {
      return ResponseFieldFile.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldFile.prototype.field_type = 'file';

    ResponseFieldFile.prototype.getValue = function() {
      return '';
    };

    ResponseFieldFile.prototype.hasValue = function() {
      return this.hasValueHashKey(['id', 'filename']);
    };

    return ResponseFieldFile;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldDate = (function(_super) {
    __extends(ResponseFieldDate, _super);

    function ResponseFieldDate() {
      return ResponseFieldDate.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldDate.prototype.field_type = 'date';

    ResponseFieldDate.prototype.validators = [FormRenderer.Validators.DateValidator];

    ResponseFieldDate.prototype.hasValue = function() {
      return this.hasValueHashKey(['month', 'day', 'year']);
    };

    return ResponseFieldDate;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldEmail = (function(_super) {
    __extends(ResponseFieldEmail, _super);

    function ResponseFieldEmail() {
      return ResponseFieldEmail.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldEmail.prototype.validators = [FormRenderer.Validators.EmailValidator];

    ResponseFieldEmail.prototype.field_type = 'email';

    return ResponseFieldEmail;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldNumber = (function(_super) {
    __extends(ResponseFieldNumber, _super);

    function ResponseFieldNumber() {
      return ResponseFieldNumber.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldNumber.prototype.validators = [FormRenderer.Validators.NumberValidator, FormRenderer.Validators.MinMaxValidator, FormRenderer.Validators.IntegerValidator];

    ResponseFieldNumber.prototype.field_type = 'number';

    return ResponseFieldNumber;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldParagraph = (function(_super) {
    __extends(ResponseFieldParagraph, _super);

    function ResponseFieldParagraph() {
      return ResponseFieldParagraph.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldParagraph.prototype.field_type = 'paragraph';

    ResponseFieldParagraph.prototype.validators = [FormRenderer.Validators.MinMaxLengthValidator];

    return ResponseFieldParagraph;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldPrice = (function(_super) {
    __extends(ResponseFieldPrice, _super);

    function ResponseFieldPrice() {
      return ResponseFieldPrice.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldPrice.prototype.validators = [FormRenderer.Validators.PriceValidator, FormRenderer.Validators.MinMaxValidator];

    ResponseFieldPrice.prototype.field_type = 'price';

    ResponseFieldPrice.prototype.hasValue = function() {
      return this.hasValueHashKey(['dollars', 'cents']);
    };

    return ResponseFieldPrice;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldText = (function(_super) {
    __extends(ResponseFieldText, _super);

    function ResponseFieldText() {
      return ResponseFieldText.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldText.prototype.field_type = 'text';

    ResponseFieldText.prototype.validators = [FormRenderer.Validators.MinMaxLengthValidator];

    return ResponseFieldText;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldTime = (function(_super) {
    __extends(ResponseFieldTime, _super);

    function ResponseFieldTime() {
      return ResponseFieldTime.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldTime.prototype.validators = [FormRenderer.Validators.TimeValidator];

    ResponseFieldTime.prototype.field_type = 'time';

    ResponseFieldTime.prototype.hasValue = function() {
      return this.hasValueHashKey(['hours', 'minutes', 'seconds']);
    };

    ResponseFieldTime.prototype.setExistingValue = function(x) {
      ResponseFieldTime.__super__.setExistingValue.apply(this, arguments);
      if (!(x != null ? x.am_pm : void 0)) {
        return this.set('value.am_pm', 'AM');
      }
    };

    return ResponseFieldTime;

  })(FormRenderer.Models.ResponseField);

  FormRenderer.Models.ResponseFieldWebsite = (function(_super) {
    __extends(ResponseFieldWebsite, _super);

    function ResponseFieldWebsite() {
      return ResponseFieldWebsite.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldWebsite.prototype.field_type = 'website';

    return ResponseFieldWebsite;

  })(FormRenderer.Models.ResponseField);

  _ref = FormRenderer.NON_INPUT_FIELD_TYPES;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    i = _ref[_i];
    FormRenderer.Models["ResponseField" + (_.str.classify(i))] = (function(_super) {
      __extends(_Class, _super);

      function _Class() {
        return _Class.__super__.constructor.apply(this, arguments);
      }

      _Class.prototype.field_type = i;

      return _Class;

    })(FormRenderer.Models.NonInputResponseField);
  }

}).call(this);

(function() {
  var i, _i, _j, _len, _len1, _ref, _ref1,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  FormRenderer.Views.Pagination = (function(_super) {
    __extends(Pagination, _super);

    function Pagination() {
      return Pagination.__super__.constructor.apply(this, arguments);
    }

    Pagination.prototype.initialize = function(options) {
      this.form_renderer = options.form_renderer;
      this.listenTo(this.form_renderer.state, 'change:activePage', this.render);
      return this.listenTo(this.form_renderer, 'afterValidate', this.render);
    };

    Pagination.prototype.render = function() {
      this.$el.html(JST['partials/pagination'](this));
      return this;
    };

    return Pagination;

  })(Backbone.View);

  FormRenderer.Views.ErrorAlertBar = (function(_super) {
    __extends(ErrorAlertBar, _super);

    function ErrorAlertBar() {
      return ErrorAlertBar.__super__.constructor.apply(this, arguments);
    }

    ErrorAlertBar.prototype.initialize = function(options) {
      this.form_renderer = options.form_renderer;
      return this.listenTo(this.form_renderer, 'afterValidate', this.render);
    };

    ErrorAlertBar.prototype.render = function() {
      this.$el.html(JST['partials/error_alert_bar'](this));
      if (!this.form_renderer.areAllPagesValid()) {
        window.scrollTo(0, 0);
      }
      return this;
    };

    return ErrorAlertBar;

  })(Backbone.View);

  FormRenderer.Views.BottomStatusBar = (function(_super) {
    __extends(BottomStatusBar, _super);

    function BottomStatusBar() {
      return BottomStatusBar.__super__.constructor.apply(this, arguments);
    }

    BottomStatusBar.prototype.events = {
      'click .go_back_button': 'handleBack',
      'click .continue_button': 'handleContinue'
    };

    BottomStatusBar.prototype.initialize = function(options) {
      this.form_renderer = options.form_renderer;
      return this.listenTo(this.form_renderer.state, 'change:activePage change:hasChanges change:submitting change:hasServerErrors', this.render);
    };

    BottomStatusBar.prototype.render = function() {
      this.$el.html(JST['partials/bottom_status_bar'](this));
      return this;
    };

    BottomStatusBar.prototype.firstPage = function() {
      return this.form_renderer.state.get('activePage') === 1;
    };

    BottomStatusBar.prototype.lastPage = function() {
      return this.form_renderer.state.get('activePage') === this.form_renderer.numPages;
    };

    BottomStatusBar.prototype.previousPage = function() {
      return this.form_renderer.state.get('activePage') - 1;
    };

    BottomStatusBar.prototype.nextPage = function() {
      return this.form_renderer.state.get('activePage') + 1;
    };

    BottomStatusBar.prototype.handleBack = function(e) {
      e.preventDefault();
      return this.form_renderer.activatePage(this.previousPage(), {
        silent: true
      });
    };

    BottomStatusBar.prototype.handleContinue = function(e) {
      e.preventDefault();
      if (this.lastPage()) {
        return this.form_renderer.submit();
      } else {
        return this.form_renderer.activatePage(this.nextPage());
      }
    };

    return BottomStatusBar;

  })(Backbone.View);

  FormRenderer.Views.Page = (function(_super) {
    __extends(Page, _super);

    function Page() {
      return Page.__super__.constructor.apply(this, arguments);
    }

    Page.prototype.className = 'form_renderer_page';

    Page.prototype.initialize = function(options) {
      this.form_renderer = options.form_renderer;
      this.models = [];
      return this.views = [];
    };

    Page.prototype.render = function() {
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
        this.views.push(view);
      }
      return this;
    };

    Page.prototype.hide = function() {
      var view, _i, _len, _ref, _results;
      this.$el.hide();
      _ref = this.views;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        _results.push(view.trigger('hidden'));
      }
      return _results;
    };

    Page.prototype.show = function() {
      var view, _i, _len, _ref, _results;
      this.$el.show();
      _ref = this.views;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        view = _ref[_i];
        _results.push(view.trigger('shown'));
      }
      return _results;
    };

    Page.prototype.validate = function() {
      var rf, view, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = _.filter(this.models, (function(rf) {
        return rf.input_field;
      }));
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        rf = _ref[_i];
        rf.validate();
      }
      _ref1 = this.views;
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        view = _ref1[_j];
        _results.push(view.render());
      }
      return _results;
    };

    return Page;

  })(Backbone.View);

  FormRenderer.Views.ResponseField = (function(_super) {
    __extends(ResponseField, _super);

    function ResponseField() {
      return ResponseField.__super__.constructor.apply(this, arguments);
    }

    ResponseField.prototype.field_type = void 0;

    ResponseField.prototype.className = 'form_renderer_response_field';

    ResponseField.prototype.initialize = function(options) {
      this.form_renderer = options.form_renderer;
      this.model = options.model;
      return this.$el.addClass("response_field_" + this.field_type);
    };

    ResponseField.prototype.getDomId = function() {
      return this.model.cid;
    };

    ResponseField.prototype.render = function() {
      this.$el[this.model.getError() ? 'addClass' : 'removeClass']('error');
      this.$el.html(JST['partials/response_field'](this));
      rivets.bind(this.$el, {
        model: this.model
      });
      return this;
    };

    return ResponseField;

  })(Backbone.View);

  FormRenderer.Views.NonInputResponseField = (function(_super) {
    __extends(NonInputResponseField, _super);

    function NonInputResponseField() {
      return NonInputResponseField.__super__.constructor.apply(this, arguments);
    }

    NonInputResponseField.prototype.render = function() {
      this.$el.addClass("response_field_" + this.field_type);
      this.$el.html(JST['partials/non_input_response_field'](this));
      return this;
    };

    return NonInputResponseField;

  })(FormRenderer.Views.ResponseField);

  FormRenderer.Views.ResponseFieldTable = (function(_super) {
    __extends(ResponseFieldTable, _super);

    function ResponseFieldTable() {
      return ResponseFieldTable.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldTable.KEY_DIRECTIONS = {
      '37': 'left',
      '38': 'up',
      '39': 'right',
      '40': 'down'
    };

    ResponseFieldTable.prototype.field_type = 'table';

    ResponseFieldTable.prototype.events = {
      'click .add_another_row': 'addRow',
      'keydown textarea': 'handleKeydown'
    };

    ResponseFieldTable.prototype.initialize = function() {
      ResponseFieldTable.__super__.initialize.apply(this, arguments);
      return this.on('shown', function() {
        return this.initExpanding();
      });
    };

    ResponseFieldTable.prototype.render = function() {
      ResponseFieldTable.__super__.render.apply(this, arguments);
      this.initExpanding();
      return this;
    };

    ResponseFieldTable.prototype.initExpanding = function() {};

    ResponseFieldTable.prototype.addRow = function() {
      this.model.numRows++;
      return this.render();
    };

    ResponseFieldTable.prototype.handleKeydown = function(e) {
      var $ta, col, row, _ref;
      if (_ref = e.which.toString(), __indexOf.call(_.keys(this.constructor.KEY_DIRECTIONS), _ref) < 0) {
        return;
      }
      $ta = $(e.currentTarget);
      col = $ta.data('col');
      row = $ta.data('row');
      switch (this.constructor.KEY_DIRECTIONS[e.which.toString()]) {
        case 'up':
        case 'left':
          if ($ta.caret() !== 0) {
            return;
          }
          break;
        case 'down':
        case 'right':
          if (!(($ta[0].selectionStart === 0 && $ta[0].selectionEnd > 0) || ($ta.caret() === $ta.val().length))) {
            return;
          }
      }
      switch (this.constructor.KEY_DIRECTIONS[e.which.toString()]) {
        case 'up':
          row -= 1;
          break;
        case 'down':
          row += 1;
          break;
        case 'left':
          col -= 1;
          break;
        case 'right':
          col += 1;
      }
      if ((col < 0) || (row < 0)) {
        return;
      }
      e.preventDefault();
      return $ta.closest('table').find("tbody tr:eq(" + row + ") td:eq(" + col + ") textarea").focus();
    };

    return ResponseFieldTable;

  })(FormRenderer.Views.ResponseField);

  FormRenderer.Views.ResponseFieldFile = (function(_super) {
    __extends(ResponseFieldFile, _super);

    function ResponseFieldFile() {
      return ResponseFieldFile.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldFile.prototype.field_type = 'file';

    ResponseFieldFile.prototype.render = function() {
      ResponseFieldFile.__super__.render.apply(this, arguments);
      if (this.form_renderer) {
        this.$el.find('.pretty_file_input').prettyFileInput({
          action: this.form_renderer.options.url,
          method: 'post',
          name: "raw_responses[" + (this.model.get('id')) + "][]",
          additional_parameters: this.form_renderer.saveParams(),
          beforeRemove: (function(_this) {
            return function() {
              return _this.model.set('value', {}, {
                silent: true
              });
            };
          })(this),
          beforeUpload: (function(_this) {
            return function(filename, pfi) {
              pfi.options.additional_parameters = _this.form_renderer.saveParams();
              return _this.model.set('value.filename', filename, {
                silent: true
              });
            };
          })(this),
          onUploadError: (function(_this) {
            return function() {
              return _this.model.set('value.filename', '', {
                silent: true
              });
            };
          })(this),
          onUploadSuccess: (function(_this) {
            return function(data) {
              _this.form_renderer.options.response.id = data.response_id;
              return _this.form_renderer.trigger('afterSave');
            };
          })(this)
        });
      }
      return this;
    };

    return ResponseFieldFile;

  })(FormRenderer.Views.ResponseField);

  FormRenderer.Views.ResponseFieldMapMarker = (function(_super) {
    __extends(ResponseFieldMapMarker, _super);

    function ResponseFieldMapMarker() {
      return ResponseFieldMapMarker.__super__.constructor.apply(this, arguments);
    }

    ResponseFieldMapMarker.prototype.field_type = 'map_marker';

    ResponseFieldMapMarker.prototype.events = {
      'click .map_marker_field_cover': 'enable',
      'click .map_marker_field_disable': 'disable'
    };

    ResponseFieldMapMarker.prototype.render = function() {
      ResponseFieldMapMarker.__super__.render.apply(this, arguments);
      this.$cover = this.$el.find('.map_marker_field_cover');
      requireOnce(App.MAP_JS_URL, (function(_this) {
        return function() {
          _this.initMap();
          if (_this.model.latLng()) {
            return _this.enable();
          }
        };
      })(this));
      return this;
    };

    ResponseFieldMapMarker.prototype.initMap = function() {
      this.map = L.map(this.$el.find('.map_marker_field_map')[0]).setView(this.model.latLng() || this.model.defaultLatLng() || App.DEFAULT_LAT_LNG, 13);
      this.$el.find('.map_marker_field_map').data('map', this.map);
      L.tileLayer(App.MAP_TILE_URL, {
        maxZoom: 18
      }).addTo(this.map);
      this.marker = L.marker([0, 0]);
      return this.map.on('move', (function(_this) {
        return function() {
          var center;
          center = _this.map.getCenter();
          _this.marker.setLatLng(center);
          _this.model.set('value.lat', center.lat.toFixed(7));
          return _this.model.set('value.lng', center.lng.toFixed(7));
        };
      })(this));
    };

    ResponseFieldMapMarker.prototype.enable = function() {
      this.map.addLayer(this.marker);
      this.$cover.hide();
      return this.map.fire('move');
    };

    ResponseFieldMapMarker.prototype.disable = function() {
      this.map.removeLayer(this.marker);
      this.$el.find('.map_marker_field_cover').show();
      this.model.set('value.lat', '');
      return this.model.set('value.lng', '');
    };

    return ResponseFieldMapMarker;

  })(FormRenderer.Views.ResponseField);

  _ref = _.without(FormRenderer.INPUT_FIELD_TYPES, 'table', 'file', 'map_marker');
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    i = _ref[_i];
    FormRenderer.Views["ResponseField" + (_.str.classify(i))] = (function(_super) {
      __extends(_Class, _super);

      function _Class() {
        return _Class.__super__.constructor.apply(this, arguments);
      }

      _Class.prototype.field_type = i;

      return _Class;

    })(FormRenderer.Views.ResponseField);
  }

  _ref1 = FormRenderer.NON_INPUT_FIELD_TYPES;
  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
    i = _ref1[_j];
    FormRenderer.Views["ResponseField" + (_.str.classify(i))] = (function(_super) {
      __extends(_Class, _super);

      function _Class() {
        return _Class.__super__.constructor.apply(this, arguments);
      }

      _Class.prototype.field_type = i;

      return _Class;

    })(FormRenderer.Views.NonInputResponseField);
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
      var k, v;
    
      _print(_safe('<div class=\'input-line\'>\n  <span class=\'street\'>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n           data-rv-input=\'model.value.street\' />\n    <label>Address</label>\n  </span>\n</div>\n\n<div class=\'input-line\'>\n  <span class=\'city\'>\n    <input type="text"\n           data-rv-input=\'model.value.city\' />\n    <label>City</label>\n  </span>\n\n  <span class=\'state\'>\n    <input type="text"\n           data-rv-input=\'model.value.state\' />\n    <label>State / Province / Region</label>\n  </span>\n</div>\n\n<div class=\'input-line\'>\n  <span class=\'zip\'>\n    <input type="text"\n           data-rv-input=\'model.value.zipcode\' />\n    <label>Zipcode</label>\n  </span>\n\n  <span class=\'country\'>\n    <select data-rv-value=\'model.value.country\'>\n      '));
    
      for (k in allCountries) {
        v = allCountries[k];
        _print(_safe('\n        <option value=\''));
        _print(k);
        _print(_safe('\'>'));
        _print(v);
        _print(_safe('</option>\n      '));
      }
    
      _print(_safe('\n    </select>\n    <label>Country</label>\n  </span>\n</div>\n'));
    
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
      _print(_safe('<div class=\'block-of-text block-of-text-size-'));
    
      _print(this.model.get('field_options.size'));
    
      _print(_safe('\'>\n  '));
    
      _print(_safe(_.simpleFormat(this.model.get('label'))));
    
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
        _print(_safe('\n  <label class=\'fb-option\'>\n    <input type=\'checkbox\' data-rv-checked=\'model.value.'));
        _print(i);
        _print(_safe('\' />\n    '));
        _print(option.label);
        _print(_safe('\n  </label>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (this.model.get('field_options.include_other_option')) {
        _print(_safe('\n  <div class=\'fb-option\'>\n    <label>\n      <input type=\'checkbox\' data-rv-checked=\'model.value.other_checkbox\' />\n      Other\n    </label>\n\n    <input type=\'text\' data-rv-input=\'model.value.other\' />\n  </div>\n'));
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
      _print(_safe('<div class=\'input-line\'>\n  <span class=\'month\'>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n           data-rv-input=\'model.value.month\'\n           maxlength=\'2\' />\n    <label>MM</label>\n  </span>\n\n  <span class=\'above-line\'>/</span>\n\n  <span class=\'day\'>\n    <input type="text"\n           data-rv-input=\'model.value.day\'\n           maxlength=\'2\' />\n    <label>DD</label>\n  </span>\n\n  <span class=\'above-line\'>/</span>\n\n  <span class=\'year\'>\n    <input type="text"\n           data-rv-input=\'model.value.year\'\n           maxlength=\'4\' />\n    <label>YYYY</label>\n  </span>\n</div>\n'));
    
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
      _print(_safe('<input type="text"\n       id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n       class="rf-size-'));
    
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
      _print(_safe('<div class=\'pretty_file_input cf '));
    
      if (this.model.get('value.filename')) {
        _print(_safe('existing'));
      }
    
      _print(_safe('\'>\n  <div class=\'existing\'>\n    <span class=\'pfi_existing_filename\'>'));
    
      _print(this.model.get('value.filename'));
    
      _print(_safe('</span>\n    <a class=\'button mini\' data-pfi=\'remove\'>Remove</a>\n  </div>\n\n  <div class=\'not_existing\'>\n    <input type=\'file\' id=\''));
    
      _print(this.getDomId());
    
      _print(_safe('\' name=\'file\'>\n    <span class=\'pfi_status\'></span>\n  </div>\n</div>\n'));
    
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
      _print(_safe('<div class=\'map_marker_field_map_wrapper\'>\n  <div class=\'map_marker_field_map\' />\n\n  <div class=\'map_marker_field_cover\'>\n    Click to set location\n  </div>\n\n  <div class=\'map_marker_field_toolbar cf\'>\n    <strong>Coordinates:</strong>\n    <span data-rv-show=\'model.value.lat\'>\n      <span data-rv-text=\'model.value.lat\' />,\n      <span data-rv-text=\'model.value.lng\' />\n    </span>\n    <span data-rv-hide=\'model.value.lat\' class=\'none\'>N/A</span>\n    <a class=\'map_marker_field_disable\' data-rv-show=\'model.value.lat\'>Clear</a>\n  </div>\n</div>\n'));
    
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
    
      _print(_safe('"\n       class="rf-size-'));
    
      _print(this.model.get('field_options.size'));
    
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
      _print(_safe('<div class=\'page-break-inner\'>\n  Page break\n</div>\n'));
    
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
    
      _print(_safe('"\n   class="rf-size-'));
    
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
      _print(_safe('<div class=\'input-line\'>\n  <span class=\'above-line\'>$</span>\n  <span class=\'dollars\'>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n           data-rv-input=\'model.value.dollars\' />\n    <label>Dollars</label>\n  </span>\n\n  '));
    
      if (!this.model.get('field_options.disable_cents')) {
        _print(_safe('\n    <span class=\'above-line\'>.</span>\n    <span class=\'cents\'>\n      <input type="text"\n             data-rv-input=\'model.value.cents\'\n             maxlength=\'2\' />\n      <label>Cents</label>\n    </span>\n  '));
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
        _print(_safe('\n  <label class=\'fb-option\'>\n    <input type=\'radio\' data-rv-checked=\'model.value.selected\' id="'));
        _print(this.getDomId());
        _print(_safe('" name="'));
        _print(this.getDomId());
        _print(_safe('" value="'));
        _print(option.label);
        _print(_safe('" />\n    '));
        _print(option.label);
        _print(_safe('\n  </label>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (this.model.get('field_options.include_other_option')) {
        _print(_safe('\n  <div class=\'fb-option\'>\n    <label>\n    <input type=\'radio\' data-rv-checked=\'model.value.selected\' id="'));
        _print(this.getDomId());
        _print(_safe('" name="'));
        _print(this.getDomId());
        _print(_safe('" value="Other" />\n      Other\n    </label>\n\n    <input type=\'text\' data-rv-input=\'model.value.other\' />\n  </div>\n'));
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
      _print(_safe('<div class=\'section-break-inner section-break-size-'));
    
      _print(this.model.get('field_options.size'));
    
      _print(_safe('\'>\n  <div class=\'section-name\'>'));
    
      _print(this.model.get('label'));
    
      _print(_safe('</div>\n  '));
    
      if (this.model.get('field_options.description')) {
        _print(_safe('\n    <p>'));
        _print(_safe(_.sanitize(_.simpleFormat(this.model.get('field_options.description'), false))));
        _print(_safe('</p>\n  '));
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
    
      _print(_safe('<table class=\'border_all\'>\n  <thead>\n    <tr>\n      '));
    
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
    
      _print(_safe('\n</table>\n\n<div class=\'margin_th margin_bh\'>\n  <a class=\'uppercase add_another_row\'><i class=\'icon-plus-sign\'></i> Add another row</a>\n</div>\n'));
    
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
    
      _print(_safe('"\n       class="rf-size-'));
    
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
      _print(_safe('<div class=\'input-line\'>\n  <span class=\'hours\'>\n    <input type="text"\n           id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n           data-rv-input=\'model.value.hours\'\n           maxlength=\'2\' />\n    <label>HH</label>\n  </span>\n\n  <span class=\'above-line\'>:</span>\n\n  <span class=\'minutes\'>\n    <input type="text"\n           data-rv-input=\'model.value.minutes\'\n           maxlength=\'2\' />\n    <label>MM</label>\n  </span>\n\n  '));
    
      if (!this.model.get('field_options.disable_seconds')) {
        _print(_safe('\n    <span class=\'above-line\'>:</span>\n\n    <span class=\'seconds\'>\n      <input type="text"\n             data-rv-input=\'model.value.seconds\'\n             maxlength=\'2\' />\n      <label>SS</label>\n    </span>\n  '));
      }
    
      _print(_safe('\n\n  <span class=\'am_pm\'>\n    <select data-rv-value=\'model.value.am_pm\'>\n      <option value=\'AM\'>AM</option>\n      <option value=\'PM\'>PM</option>\n    </select>\n  </span>\n</div>\n'));
    
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
      _print(_safe('<input type="text"\n       id="'));
    
      _print(this.getDomId());
    
      _print(_safe('"\n       class="rf-size-'));
    
      _print(this.model.get('field_options.size'));
    
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
      _print(_safe('<div class=\'bottom_status_bar cf\'>\n  <div class=\'ninety_wrapper\'>\n    <div class=\'align_left\'>\n      <div class=\'saved_status_indicator '));
    
      if (this.form_renderer.state.get('hasServerErrors')) {
        _print(_safe('error'));
      } else if (this.form_renderer.state.get('hasChanges')) {
        _print(_safe('saving'));
      }
    
      _print(_safe('\'>\n        <span class=\'icon_wrapper\'>\n          <i class=\'icon-cloud\'></i>\n          <i class=\'icon-ok\'></i>\n        </span>\n\n        <span class=\'status_wrapper\'>\n          <span class=\'saving\'>Saving...</span>\n          <span class=\'saved\'>Saved</span>\n          <span class=\'error\'>Error saving</span>\n        </span>\n      </div>\n    </div>\n\n    <div class=\'align_right\'>\n      <div class=\'button_wrapper\'>\n        '));
    
      if (this.firstPage()) {
        _print(_safe('\n          <a class=\'button arrow_l darker_gray lap_show_i\' href=\''));
        _print(this.form_renderer.options.backToProjectUrl);
        _print(_safe('\'>\n            Back to project\n          </a>\n        '));
      } else {
        _print(_safe('\n          <a class=\'button arrow_l darker_gray go_back_button lap_show_i\'>\n            Back to page '));
        _print(this.previousPage());
        _print(_safe('\n          </a>\n        '));
      }
    
      _print(_safe('\n\n        '));
    
      if (this.form_renderer.state.get('submitting')) {
        _print(_safe('\n          <a class=\'button arrow info continue_button disabled\'>\n            Loading preview...\n          </a>\n        '));
      } else {
        _print(_safe('\n          <a class=\'button arrow info continue_button\'>\n            '));
        if (this.lastPage()) {
          _print(_safe('Preview and submit'));
        } else {
          _print(_safe('Next page'));
        }
        _print(_safe('\n          </a>\n        '));
      }
    
      _print(_safe('\n      </div>\n    </div>\n  </div>\n</div>\n'));
    
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
        _print(_safe('\n  <span class=\'help-block\'>\n    '));
        _print(_safe(_.sanitize(_.simpleFormat(this.model.get('field_options.description'), false))));
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
        _print(_safe('\n  <span class=\'help-block validation-message-wrapper\'>\n    '));
        _print(this.model.getError());
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
        _print(_safe('\n  <div class=\'error_alert\'>Your response has validation errors.</div>\n'));
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
    
      _print(_safe('\n</label>'));
    
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
        _print(_safe('\n  <div class=\'min_max\'>\n    '));
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
        _print(_safe('\n\n    Current count:\n    <code class=\'min_max_counter\' data-rv-text=\'model.currentLength\'></code>\n    '));
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
        _print(_safe('\n  <div class=\'min_max\'>\n    '));
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
      var i, _i, _ref;
    
      if (this.form_renderer.numPages > 1) {
        _print(_safe('\n  <ul class=\'formbuilder_form_pages_list cf\'>\n    '));
        for (i = _i = 1, _ref = this.form_renderer.numPages; 1 <= _ref ? _i <= _ref : _i >= _ref; i = 1 <= _ref ? ++_i : --_i) {
          _print(_safe('\n      '));
          if (i === this.form_renderer.state.get('activePage')) {
            _print(_safe('\n        <li class=\''));
            if (!this.form_renderer.isPageValid(i)) {
              _print(_safe('has_errors'));
            }
            _print(_safe('\'><span>'));
            _print(i);
            _print(_safe('</span></li>\n      '));
          } else {
            _print(_safe('\n        <li class=\''));
            if (!this.form_renderer.isPageValid(i)) {
              _print(_safe('has_errors'));
            }
            _print(_safe('\'><a data-activate-page="'));
            _print(i);
            _print(_safe('">'));
            _print(i);
            _print(_safe('</a></li>\n      '));
          }
          _print(_safe('\n    '));
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
    
      _print(_safe('\n\n<div class=\'clear\' />\n\n'));
    
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
