(function(window){//# Ensure jQuery isn't in noConflict mode
var $, _str;

$ = jQuery;

// Alias underscore.string in case underscore gets overriden...
_str = _.str;

//# Rivets
rivets.inputEvent = document.addEventListener ? 'input' : 'keyup';

rivets.binders.input = {
  publishes: true,
  routine: rivets.binders.value.routine,
  bind: function(el) {
    return $(el).bind(`${rivets.inputEvent}.rivets`, this.publish);
  },
  unbind: function(el) {
    return $(el).unbind(`${rivets.inputEvent}.rivets`);
  }
};

rivets.binders.checkedarray = {
  publishes: true,
  routine: function(el, value) {
    return el.checked = _.contains(value, el.value);
  },
  bind: function(el) {
    return $(el).bind('change.rivets', () => {
      var newVal, val;
      val = this.model.get(this.keypath) || [];
      newVal = el.checked ? _.uniq(val.concat(el.value)) : _.without(val, el.value);
      return this.model.set(this.keypath, newVal);
    });
  },
  unbind: function(el) {
    return $(el).unbind('change.rivets');
  }
};

rivets.binders.dobtradiogroup = {
  publishes: true,
  routine: function(el, value) {
    return el.checked = $(el).hasClass('js_other_option') ? this.model.get('value.other_checked') : _.contains(value, el.value);
  },
  bind: function(el) {
    return $(el).bind('change.rivets', () => {
      if ($(el).hasClass('js_other_option')) {
        this.model.set('value.other_checked', true);
        return this.model.set(this.keypath, []);
      } else {
        this.model.unset('value.other_checked');
        this.model.unset('value.other_text');
        return this.model.set(this.keypath, [el.value]);
      }
    });
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
      skipConditions: void 0,
      saveParams: {},
      showLabels: false,
      scrollToPadding: 0,
      plugins: ['Autosave', 'WarnBeforeUnload', 'BottomBar', 'ErrorBar', 'SavedSession']
    },
    events: {
      "click button#screendoor-verify-identity": 'verifyIdentity'
    },
    verifyIdentity: function(event) {
      var endpoint;
      event.preventDefault();
      endpoint = $(event.currentTarget).data('href');
      return $.ajax({
        url: endpoint,
        type: 'get',
        success: function(data) {
          return $('div.fr_loading').html(JST["partials/email_sent"]({
            'message': data.message
          }));
        }
      });
    },
    //# Initialization logic
    constructor: function(options) {
      var i, len, p, ref;
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
      this.plugins = _.map(this.options.plugins, (pluginName) => {
        return new FormRenderer.Plugins[pluginName](this);
      });
      ref = this.plugins;
      for (i = 0, len = ref.length; i < len; i++) {
        p = ref[i];
        if (typeof p.beforeFormLoad === "function") {
          p.beforeFormLoad();
        }
      }
      // Loading state
      this.$el.html(JST['main'](this));
      this.trigger('viewRendered', this);
      this.loadFromServer(() => {
        var base, j, len1, ref1;
        this.$el.find('.fr_loading').remove();
        this.initFormComponents(this.options.response_fields, this.options.response.responses);
        this.initPages();
        if (this.options.enablePages) {
          this.initPagination();
        } else {
          this.initNoPagination();
        }
        ref1 = this.plugins;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          p = ref1[j];
          if (typeof p.afterFormLoad === "function") {
            p.afterFormLoad();
          }
        }
        if (this.options.validateImmediately) {
          this.validate();
        }
        this.trigger('ready');
        return typeof (base = this.options).onReady === "function" ? base.onReady() : void 0;
      });
      // If @$el is a <form>, make extra-sure that it can't be submitted natively
      this.$el.on('submit', function(e) {
        return e.preventDefault();
      });
      return this;
    },
    maybe_delete_jwt_token: function(xhr) {
      var ref;
      // We can't verify anonymous responses.
      if (((ref = xhr.responseJSON) != null ? ref.template : void 0) === 'Submission time has expired.') {
        return delete window.sessionStorage['jwtToken'];
      }
    },
    corsSupported: function() {
      return 'withCredentials' in new XMLHttpRequest();
    },
    projectUrl: function() {
      return `${this.options.screendoorBase}/projects/${this.options.project_id}`;
    },
    authorizationHeader: function() {
      if (window.sessionStorage.jwtToken) {
        return {
          'Authorization': 'Bearer jwt_token=' + window.sessionStorage.jwtToken
        };
      } else {
        return {};
      }
    },
    tokenlessQueryParams: function(queryString) {
      var params, queryParams;
      params = queryString.split('?')[1].split('&');
      queryParams = _.filter(params, function(pair) {
        return !pair.match(/respondent_auth_token/);
      });
      return '?' + queryParams.join('&');
    },
    // Fetch the details of this form from the Screendoor API
    loadFromServer: function(cb) {
      if ((this.options.response_fields != null) && (this.options.response.responses != null)) {
        return cb();
      }
      return $.ajax({
        url: `${this.options.screendoorBase}/api/form_renderer/load`,
        type: 'get',
        dataType: 'json',
        data: this.loadParams(),
        headers: _.extend(this.serverHeaders, this.authorizationHeader()),
        success: (data, status, xhr) => {
          var base, base1, ref;
          if (xhr.getResponseHeader('jwt_token') != null) {
            window.sessionStorage.jwtToken = xhr.getResponseHeader('jwt_token');
          }
          (base = this.options).response_fields || (base.response_fields = data.project.response_fields);
          (base1 = this.options.response).responses || (base1.responses = ((ref = data.response) != null ? ref.responses : void 0) || {});
          if (this.options.afterSubmit == null) {
            this.options.afterSubmit = {
              method: 'page',
              html: data.project.after_response_page_html || `<p>${FormRenderer.t.thanks}</p>`
            };
          }
          cb();
          if (document.location.search.match(/respondent_auth_token/)) {
            return document.location.search = this.tokenlessQueryParams(document.location.search);
          }
        },
        error: (xhr) => {
          var ref, ref1, ref2, ref3, ref4;
          if (!this.corsSupported()) {
            return this.$el.find('.fr_loading').html(FormRenderer.t.not_supported.replace(/\:url/g, this.projectUrl()));
          } else if (((ref = xhr.responseJSON) != null ? ref.error : void 0) === 'Token expired. Verify identity.') {
            this.$el.html(JST["partials/verify"]({
              'template': (ref1 = xhr.responseJSON) != null ? ref1.template : void 0,
              'href': (ref2 = xhr.responseJSON) != null ? ref2.verify_api_endpoint : void 0,
              'button': (ref3 = xhr.responseJSON) != null ? ref3.verify_email_button : void 0
            }));
            return this.maybe_delete_jwt_token(xhr);
          } else {
            this.$el.find('.fr_loading').text(`${FormRenderer.t.error_loading}: \"${((ref4 = xhr.responseJSON) != null ? ref4.error : void 0) || 'Unknown'}\"`);
            return this.trigger('errorSaving', xhr);
          }
        }
      });
    },
    // Build pages, which contain the response fields views.
    initPages: function() {
      var addPage, currentPageInLoop, page, pageNumber, ref, results;
      addPage = () => {
        return this.subviews.pages[currentPageInLoop] = new FormRenderer.Views.Page({
          form_renderer: this
        });
      };
      this.numPages = this.formComponents.where({
        field_type: 'page_break'
      }).length + 1;
      this.state.set('activePage', 1);
      currentPageInLoop = 1;
      addPage();
      this.formComponents.each((rf) => {
        if (rf.get('field_type') === 'page_break') {
          currentPageInLoop++;
          return addPage();
        } else {
          return this.subviews.pages[currentPageInLoop].models.push(rf);
        }
      });
      ref = this.subviews.pages;
      results = [];
      for (pageNumber in ref) {
        page = ref[pageNumber];
        results.push(this.$el.append(page.render().el));
      }
      return results;
    },
    initPagination: function() {
      this.subviews.pagination = new FormRenderer.Views.Pagination({
        form_renderer: this
      });
      this.$el.prepend(this.subviews.pagination.render().el);
      return this.subviews.pages[this.state.get('activePage')].show();
    },
    initNoPagination: function() {
      var page, pageNumber, ref, results;
      ref = this.subviews.pages;
      results = [];
      for (pageNumber in ref) {
        page = ref[pageNumber];
        results.push(page.show());
      }
      return results;
    },
    //# Pages / Validation
    activatePage: function(newPageNumber) {
      this.subviews.pages[this.state.get('activePage')].hide();
      this.subviews.pages[newPageNumber].show();
      window.scrollTo(0, this.options.scrollToPadding);
      return this.state.set('activePage', newPageNumber);
    },
    validate: function() {
      var _, page, ref;
      ref = this.subviews.pages;
      for (_ in ref) {
        page = ref[_];
        page.validate();
      }
      this.trigger('afterValidate afterValidate:all');
      return this.areAllPagesValid();
    },
    isPageVisible: function(pageNumber) {
      var ref;
      return (ref = this.subviews.pages[pageNumber]) != null ? ref.isVisible() : void 0;
    },
    isPageValid: function(pageNumber) {
      var ref;
      return (ref = this.subviews.pages[pageNumber]) != null ? ref.isValid() : void 0;
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
      var ref;
      return _.filter((function() {
        var results = [];
        for (var i = 1, ref = this.numPages; 1 <= ref ? i <= ref : i >= ref; 1 <= ref ? i++ : i--){ results.push(i); }
        return results;
      }).apply(this), (x) => {
        return this.isPageValid(x) === false;
      });
    },
    areAllPagesValid: function() {
      return this.invalidPages().length === 0;
    },
    visiblePages: function() {
      return _.tap([], (a) => {
        var _, num, ref, results;
        ref = this.subviews.pages;
        results = [];
        for (num in ref) {
          _ = ref[num];
          if (this.isPageVisible(num)) {
            results.push(a.push(parseInt(num, 10)));
          } else {
            results.push(void 0);
          }
        }
        return results;
      });
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
    queryParams: function() {
      return FormRenderer.queryParams(document.location.search);
    },
    //# Saving
    loadParams: function() {
      return _.extend({
        v: 0,
        response_id: this.options.response.id,
        project_id: this.options.project_id,
        responder_language: this.options.responderLanguage,
        query_params: this.queryParams()
      }, this.followUpFormParams());
    },
    saveParams: function() {
      return _.extend(this.loadParams(), {
        skip_validation: this.options.skipValidation
      }, this.options.saveParams);
    },
    followUpFormParams: function() {
      if (this.isRenderingFollowUpForm()) {
        return {
          follow_up_form_id: this.options.follow_up_form_id,
          initial_response_id: this.options.initial_response_id
        };
      } else {
        return {};
      }
    },
    isRenderingFollowUpForm: function() {
      return !!this.options.follow_up_form_id;
    },
    responsesChanged: function() {
      this.state.set('hasChanges', true);
      // Handle the edge case when the form is saved while there's an AJAX
      // request pending.
      if (this.isSaving) {
        return this.changedWhileSaving = true;
      }
    },
    // Options:
    //   submit (boolean) if true, tell the server to submit the response
    //   cb (function) a callback that will be called on success
    save: function(options = {}) {
      if (this.isSaving) {
        return;
      }
      this.requests += 1;
      this.isSaving = true;
      this.changedWhileSaving = false;
      return $.ajax({
        url: `${this.options.screendoorBase}/api/form_renderer/save`,
        type: 'post',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(_.extend(this.saveParams(), {
          raw_responses: this.getValue(),
          submit: options.submit ? true : void 0
        })),
        headers: _.extend(this.serverHeaders, this.authorizationHeader()),
        complete: () => {
          this.requests -= 1;
          this.isSaving = false;
          return this.trigger('afterSave');
        },
        success: (data, state, xhr) => {
          var ref;
          if (xhr.getResponseHeader('jwt_token') != null) {
            window.sessionStorage.jwtToken = xhr.getResponseHeader('jwt_token');
          }
          this.state.set({
            hasChanges: this.changedWhileSaving,
            hasServerErrors: false
          });
          this.options.response.id = data.response_id;
          return (ref = options.cb) != null ? ref.apply(this, arguments) : void 0;
        },
        error: (xhr) => {
          var ref, ref1, ref2, ref3, ref4, ref5;
          this.state.set({
            hasServerErrors: true,
            serverErrorText: (ref = xhr.responseJSON) != null ? ref.error : void 0,
            serverErrorKey: (ref1 = xhr.responseJSON) != null ? ref1.error_key : void 0,
            submitting: false
          });
          if (((ref2 = xhr.responseJSON) != null ? ref2.error : void 0) === 'Token expired. Verify identity.') {
            this.$el.html(JST["partials/verify"]({
              'template': (ref3 = xhr.responseJSON) != null ? ref3.template : void 0,
              'href': (ref4 = xhr.responseJSON) != null ? ref4.verify_api_endpoint : void 0,
              'button': (ref5 = xhr.responseJSON) != null ? ref5.verify_email_button : void 0
            }));
            return this.maybe_delete_jwt_token(xhr);
          }
        }
      });
    },
    waitForRequests: function(cb) {
      if (this.requests > 0) {
        return setTimeout((() => {
          return this.waitForRequests(cb);
        }), 100);
      } else {
        return cb();
      }
    },
    submit: function(opts = {}) {
      if (!(opts.skipValidation || this.options.skipValidation || this.validate())) {
        return;
      }
      this.state.set('submitting', true);
      return this.waitForRequests(() => {
        if (this.options.preview) {
          return this._preview();
        } else {
          return this.save({
            submit: true,
            cb: () => {
              this.trigger('afterSubmit');
              return this._afterSubmit();
            }
          });
        }
      });
    },
    _afterSubmit: function() {
      var $page, as;
      as = this.options.afterSubmit;
      if (typeof as === 'function') {
        return as.call(this);
      } else if (typeof as === 'string') {
        return window.location = as.replace(':id', this.options.response.id.split(',')[0]);
      } else if (typeof as === 'object' && as.method === 'page') {
        $page = $(`<div class='fr_after_submit_page'>${as.html}</div>`);
        return this.$el.replaceWith($page);
      } else {
        return console.log('[FormRenderer] Not sure what to do...');
      }
    },
    _preview: function() {
      var cb;
      cb = () => {
        return window.location = this.options.preview.replace(':id', this.options.response.id.split(',')[0]);
      };
      if (!this.state.get('hasChanges') && this.options.response.id) {
        return cb();
      } else {
        return this.save({
          cb: cb
        });
      }
    },
    reflectConditions: function() {
      var _, page, ref, ref1;
      ref = this.subviews.pages;
      for (_ in ref) {
        page = ref[_];
        page.reflectConditions();
      }
      return (ref1 = this.subviews.pagination) != null ? ref1.render() : void 0;
    }
  });

  //# Class-level configs
  FormRenderer.BUTTON_CLASS = 'fr_button';

  FormRenderer.DEFAULT_LAT_LNG = [40.7700118, -73.9800453];

  FormRenderer.MAPBOX_URL = 'https://api.tiles.mapbox.com/mapbox.js/v2.1.4/mapbox.js';

  // Keep in-sync with Screendoor
  FormRenderer.EMAIL_REGEX = /^\s*([^@\s]{1,64})@((?:[-a-z0-9]+\.)+[a-z]{2,})\s*$/i;

  FormRenderer.ADD_ROW_ICON = '+';

  FormRenderer.REMOVE_ROW_ICON = '-';

  FormRenderer.REMOVE_ENTRY_LINK_CLASS = 'fr_group_entry_remove';

  FormRenderer.REMOVE_ENTRY_LINK_HTML = 'Remove';

  //# Settin' these up for later
  FormRenderer.Views = {};

  FormRenderer.Models = {};

  FormRenderer.Plugins = {};

  //# Validators have been deprecated, but are kept here for backwards-compatibility.
  FormRenderer.Validators = {
    EmailValidator: {
      VALID_REGEX: FormRenderer.EMAIL_REGEX
    }
  };

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
      return FormRenderer.Views.ResponseFieldRepeatingGroup;
    } else if ((foundKlass = FormRenderer.Views[`ResponseField${_str.classify(field.field_type)}`])) {
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

  FormRenderer.formComponentModelClass = function(field) {
    return FormRenderer.Models[`ResponseField${_str.classify(field.field_type)}`];
  };

  FormRenderer.buildFormComponentModel = function(field, fr, parent) {
    var klass;
    klass = FormRenderer.formComponentModelClass(field);
    return new klass(field, fr, parent);
  };

}).call(this);

(function() {
  var ALLOWED_ATTRIBUTES, ALLOWED_TAGS, autoLink, sanitize, simpleFormat;

  ALLOWED_TAGS = ['a', 'p', 'br', 'b', 'strong', 'em', 'i'];

  ALLOWED_ATTRIBUTES = ['href', 'target'];

  autoLink = function(str) {
    var pattern;
    pattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi; // Capture the beginning of string or line or leading whitespace
    // Look for a valid URL protocol (non-captured)
    // Valid URL characters (any number of times)
    // String must end in a valid URL character
    return str.replace(pattern, "$1<a href='$2' target='_blank'>$2</a>");
  };

  simpleFormat = function(str = '') {
    return `${str}`.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br />' + '$2');
  };

  sanitize = function(str) {
    return DOMPurify.sanitize(str, {
      ALLOWED_TAGS: ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTRIBUTES
    });
  };

  FormRenderer.formatAndSanitizeHTML = function(unsafeHTML) {
    return sanitize(autoLink(simpleFormat(unsafeHTML)));
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
  FormRenderer.queryParams = function(value) {
    return value.substring(1).split('&').filter(function(value) {
      return value !== '';
    }).reduce((function(params, entry) {
      entry = entry.split('=');
      if (entry.length === 2) {
        params[entry[0]] = entry[1];
      }
      return params;
    }), {});
  };

}).call(this);

(function() {
  FormRenderer.toBoolean = function(str) {
    return _.contains(['True', 'Yes', 'true', '1', 1, 'yes', true], str);
  };

}).call(this);

(function() {
  FormRenderer.VERSION = '1.4.1';

}).call(this);

(function() {
  var commonCountries;

  commonCountries = ['US', 'GB', 'CA'];

  FormRenderer.ORDERED_COUNTRIES = _.uniq(_.union(commonCountries, [void 0], _.keys(ISOCountryNames)));

  // Provinces are hardcoded for now, since they're way less likely to change
  // than the country names list.
  FormRenderer.PROVINCES_CA = ['Alberta', 'British Columbia', 'Labrador', 'Manitoba', 'New Brunswick', 'Newfoundland', 'Nova Scotia', 'Nunavut', 'Northwest Territories', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewen', 'Yukon'];

  FormRenderer.PROVINCES_US = ['Alabama', 'Alaska', 'American Samoa', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District Of Columbia', 'Federated States Of Micronesia', 'Florida', 'Georgia', 'Guam', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Marshall Islands', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Northern Mariana Islands', 'Ohio', 'Oklahoma', 'Oregon', 'Palau', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virgin Islands', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];

}).call(this);

(function() {
  var presenceMethods,
    indexOf = [].indexOf;

  presenceMethods = ['present', 'blank'];

  FormRenderer.ConditionChecker = class ConditionChecker {
    constructor(responseField, condition) {
      var ref;
      this.responseField = responseField;
      this.condition = condition;
      this.value = ((ref = this.responseField) != null ? ref.toText() : void 0) || '';
    }

    method_eq() {
      return this.value.toLowerCase() === this.condition.value.toLowerCase();
    }

    method_contains() {
      return this.value.toLowerCase().indexOf(this.condition.value.toLowerCase()) > -1;
    }

    method_not() {
      return !this.method_eq();
    }

    method_does_not_contain() {
      return !this.method_contains();
    }

    method_gt() {
      return parseFloat(this.value) > parseFloat(this.condition.value);
    }

    method_lt() {
      return parseFloat(this.value) < parseFloat(this.condition.value);
    }

    method_shorter() {
      return this.length() < parseInt(this.condition.value, 10);
    }

    method_longer() {
      return this.length() > parseInt(this.condition.value, 10);
    }

    method_present() {
      return !!this.value.match(/\S/);
    }

    method_blank() {
      return !this.method_present();
    }

    length() {
      return FormRenderer.getLength(this.responseField.getLengthValidationUnits(), this.value);
    }

    isValid() {
      var ref;
      return this.responseField && _.all(['response_field_id', 'method'], ((x) => {
        return this.condition[x];
      })) && ((ref = this.condition.method, indexOf.call(presenceMethods, ref) >= 0) || this.condition['value']);
    }

    isVisible() {
      var ref, ref1, ref2, ref3;
      if ((ref = this.responseField) != null ? (ref1 = ref.fr) != null ? (ref2 = ref1.options) != null ? ref2.skipConditions : void 0 : void 0 : void 0) {
        return true;
      }
      if (!this.isValid()) {
        return true;
      }
      if (ref3 = this.condition.method, indexOf.call(presenceMethods, ref3) >= 0) {
        return this[`method_${this.condition.method}`]();
      } else {
        return this.method_present() && this[`method_${this.condition.method}`]();
      }
    }

  };

}).call(this);

(function() {
  FormRenderer.Models.BaseFormComponent = Backbone.DeepModel.extend({
    // @param @fr the fr instance
    // @param @parent either the fr instance, or the RepeatingGroupEntry
    // that this field belongs to.
    initialize: function(_, fr, parent) {
      this.fr = fr;
      this.parent = parent;
      return this.calculateVisibility();
    },
    sync: function() {},
    // Not named `validate` beacuse that conflicts with Backbone
    validateComponent: function() {},
    setExistingValue: function() {},
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
    parentGroupIsHidden: function() {
      return (this.parent.repeatingGroup != null) && !this.parent.repeatingGroup.isVisible;
    },
    // @return [Boolean] true if the new value is different than the old value
    calculateVisibilityIsChanged: function() {
      var prevValue;
      prevValue = !!this.isVisible;
      this.calculateVisibility();
      return prevValue !== this.isVisible;
    },
    calculateVisibility: function() {
      return this.isVisible = this._calculateIsVisible();
    },
    _calculateIsVisible: function() {
      if (!this.renderingRespondentForm()) {
        // If we're not in a form_renderer context, this field is visible
        return true;
      }
      // Otherwise, it's only visible if it satisfies its conditions of visibility.
      return this.satisfiesConditions(this.parent.formComponents);
    },
    // NOTE: this method is called directly from FormBuilder
    satisfiesConditions: function(formComponents) {
      if (!this.isConditional()) {
        // If no conditions, it's visible
        return true;
      }
      return _[this.conditionMethod()](this.getConditions(), (conditionHash) => {
        var conditionChecker;
        conditionChecker = new FormRenderer.ConditionChecker(formComponents.get(conditionHash.response_field_id), conditionHash);
        return conditionChecker.isVisible();
      });
    },
    conditionMethod: function() {
      if (this.get('condition_method') === 'any') {
        return 'any';
      } else {
        return 'all';
      }
    },
    renderingRespondentForm: function() {
      return !!this.fr;
    }
  });

}).call(this);

(function() {
  var _isPageButton,
    indexOf = [].indexOf;

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
    initialize: function() {
      FormRenderer.Models.BaseFormComponent.prototype.initialize.apply(this, arguments);
      this.errors = [];
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
      if (x != null) {
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
      } else if (this.valueType === 'string') {
        return "";
      }
    },
    // used for conditionals
    toText: function() {
      return this.getValue();
    },
    hasValue: function() {
      if (this.valueType === 'hash') {
        return _.some(this.get('value') || {}, (v, k) => {
          return !(indexOf.call(this.ignoreKeysWhenCheckingPresence(), k) >= 0) && !!v;
        });
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
      this._sharedInitialize(options);
      this.listenTo(this.model, 'afterValidate', this.render);
      this.listenTo(this.model, 'change', this._onInput);
      this.listenTo(this.model, 'change:currentLength', this.auditLength);
      this.listenTo(this.model, 'change:error', this.toggleErrorModifier);
      return this.$el.addClass(`fr_response_field_${this.model.field_type}`);
    },
    _onBlur: function(e) {
      // Only run if the value is present
      if (this.model.hasValue()) {
        // This is the best method we have for getting the new active element.
        // See http://stackoverflow.com/questions/121499/
        return setTimeout(() => {
          var newActive;
          newActive = document.activeElement;
          if (!$.contains(this.el, newActive)) {
            if (_isPageButton(newActive)) {
              return $(document).one('mouseup', () => {
                return this.model.validateComponent();
              });
            } else {
              return this.model.validateComponent();
            }
          }
        }, 1);
      }
    },
    // Run validations on change if there are errors
    _onInput: function() {
      if (this.model.errors.length > 0) {
        return this.model.validateComponent({
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
      var ref;
      this.$el.html(JST[`partials/${this.partialName()}`](this));
      rivets.bind(this.$el, {
        model: this.model
      });
      this.auditLength();
      if ((ref = this.form_renderer) != null) {
        ref.trigger('viewRendered', this);
      }
      return this;
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.NonInputResponseField = FormRenderer.Models.ResponseField.extend({
    input_field: false,
    validateComponent: function() {}
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldRepeatingGroup = FormRenderer.Models.BaseFormComponent.extend({
    group: true,
    field_type: 'repeating_group',
    initialize: function() {
      FormRenderer.Models.BaseFormComponent.prototype.initialize.apply(this, arguments);
      return this.entries = [];
    },
    validateComponent: function() {
      var entry, i, len, ref, results;
      ref = this.entries;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        entry = ref[i];
        results.push(entry.formComponents.invoke('validateComponent'));
      }
      return results;
    },
    setExistingValue: function(entryValues) {
      if (this.isRequired()) {
        if (!entryValues || entryValues.length === 0) {
          entryValues = [{}]; // Field is optional...
        }
      } else {
        if (!entryValues) {
          entryValues = [{}];
        // If entryValues is an empty array, the field is skipped.
        } else if (_.isArray(entryValues) && _.isEmpty(entryValues)) {
          this.set('skipped', true);
        }
      }
      return this.entries = _.map(entryValues, (value) => {
        return new FormRenderer.Models.ResponseFieldRepeatingGroupEntry({value}, this.fr, this);
      });
    },
    addEntry: function() {
      this.entries.push(new FormRenderer.Models.ResponseFieldRepeatingGroupEntry({}, this.fr, this));
      return this.fr.responsesChanged();
    },
    removeEntry: function(idx) {
      this.entries.splice(idx, 1);
      if (this.entries.length === 0) {
        this.set('skipped', true);
      }
      return this.fr.responsesChanged();
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
    getTruncatedDescription: function() {
      var description, truncation_length;
      description = this.get('description');
      truncation_length = 140;
      if (description && description.length > truncation_length) {
        description = description.substr(0, truncation_length).trim() + '…';
      }
      return description;
    },
    maxEntries: function() {
      if (this.get('maxentries')) {
        return parseInt(this.get('maxentries'), 10) || 2e308;
      } else {
        return 2e308;
      }
    },
    canAdd: function() {
      return this.entries.length < this.maxEntries();
    }
  });

  FormRenderer.Models.ResponseFieldRepeatingGroupEntry = Backbone.Model.extend({
    field_type: 'repeating_group_entry',
    initialize: function(_attrs, fr, repeatingGroup) {
      var children;
      this.fr = fr;
      this.repeatingGroup = repeatingGroup;
      children = this.repeatingGroup.get('children');
      if (children == null) {
        children = [];
      }
      return this.initFormComponents(children, this.get('value') || {});
    },
    reflectConditions: function() {
      return this.view.reflectConditions();
    },
    canRemove: function() {
      return this.repeatingGroup.entries.length > 1;
    }
  });

  FormRenderer.Views.ResponseFieldRepeatingGroup = Backbone.View.extend({
    className: 'fr_response_field fr_response_field_group',
    events: {
      'click .js-remove-entry': 'removeEntry',
      'click .js-add-entry': 'addEntry',
      'click .js-skip': 'toggleSkip'
    },
    initialize: function(options) {
      this._sharedInitialize(options);
      // Forward `shown` and `hidden` events to subviews
      this.on('shown', () => {
        var i, len, ref, results, view;
        ref = this.views;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          view = ref[i];
          results.push(view.trigger('shown'));
        }
        return results;
      });
      return this.on('hidden', () => {
        var i, len, ref, results, view;
        ref = this.views;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          view = ref[i];
          results.push(view.trigger('hidden'));
        }
        return results;
      });
    },
    toggleSkip: function() {
      this.model.set('skipped', !this.model.isSkipped());
      if (!this.model.isSkipped() && this.model.entries.length === 0) {
        this.addEntry();
      }
      this.form_renderer.responsesChanged();
      return this.render();
    },
    addEntry: function() {
      this.model.addEntry();
      this.render();
      return _.last(this.views).focus();
    },
    removeEntry: function(e) {
      var idx;
      idx = this.$el.find('.js-remove-entry').index(e.target.closest('.js-remove-entry'));
      this.model.removeEntry(idx);
      return this.render();
    },
    render: function() {
      var $els, entry, i, idx, len, ref, ref1, view;
      this.views = [];
      $els = $();
      ref = this.model.entries || [];
      for (idx = i = 0, len = ref.length; i < len; idx = ++i) {
        entry = ref[idx];
        view = new FormRenderer.Views.ResponseFieldRepeatingGroupEntry({
          entry: entry,
          form_renderer: this.form_renderer,
          idx: idx
        });
        entry.view = view;
        $els = $els.add(view.render().el);
        this.views.push(view);
      }
      this.$el.html(JST['partials/repeating_group'](this));
      this.$el.removeClass('is_truncated');
      if (this.model.entries.length && this.model.entries[0].formComponents.length > 0) {
        this.$el.addClass('is_truncated');
      }
      rivets.bind(this.$el, {model: this.model});
      this.$el.find('.fr_group_entries').append($els);
      if ((ref1 = this.form_renderer) != null) {
        ref1.trigger('viewRendered', this);
      }
      return this;
    }
  });

  FormRenderer.Views.ResponseFieldRepeatingGroupEntry = Backbone.View.extend({
    className: 'fr_group_entry',
    initialize: function(options) {
      this.entry = options.entry;
      this.form_renderer = options.form_renderer;
      this.idx = options.idx;
      this.views = [];
      // Forward `shown` and `hidden` events to subviews
      this.on('shown', () => {
        var i, len, ref, results, view;
        ref = this.views;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          view = ref[i];
          results.push(view.trigger('shown'));
        }
        return results;
      });
      return this.on('hidden', () => {
        var i, len, ref, results, view;
        ref = this.views;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          view = ref[i];
          results.push(view.trigger('hidden'));
        }
        return results;
      });
    },
    render: function() {
      var $children, ref;
      this.$el.html(JST['partials/repeating_group_entry'](this));
      if ((ref = this.form_renderer) != null) {
        ref.trigger('viewRendered', this);
      }
      $children = this.$el.find('.fr_group_entry_fields');
      this.entry.formComponents.each((rf) => {
        var view;
        view = FormRenderer.buildFormComponentView(rf, this.form_renderer);
        $children.append(view.render().el);
        view.reflectConditions();
        return this.views.push(view);
      });
      return this;
    },
    reflectConditions: function() {
      var i, len, ref, results, view;
      ref = this.views;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        view = ref[i];
        results.push(view.reflectConditions());
      }
      return results;
    },
    focus: function() {
      return this.views[0].focus();
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

  FormRenderer.Views.ResponseFieldBlockOfText = FormRenderer.Views.ResponseField.extend({
    field_type: 'block_of_text'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldCheckboxes = FormRenderer.Models.ResponseField.extend({
    field_type: 'checkboxes',
    wrapper: 'fieldset',
    setExistingValue: function(x) {
      var h, i, len, option, ref;
      if (x == null) {
        h = {
          checked: []
        };
        ref = this.getOptions();
        // Set default values
        for (i = 0, len = ref.length; i < len; i++) {
          option = ref[i];
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
      var arr, ref;
      arr = ((ref = this.get('value.checked')) != null ? ref.slice(0) : void 0) || [];
      if (this.get('value.other_checked') === true) {
        arr.push(this.get('value.other_text'));
      }
      return arr.join(' ');
    },
    hasValue: function() {
      var ref;
      return ((ref = this.get('value.checked')) != null ? ref.length : void 0) > 0 || this.get('value.other_checked');
    }
  });

  FormRenderer.Views.ResponseFieldCheckboxes = FormRenderer.Views.ResponseField.extend({
    wrapper: 'fieldset',
    field_type: 'checkboxes'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldConfirm = FormRenderer.Models.ResponseField.extend({
    field_type: 'confirm',
    wrapper: 'none',
    getValue: function() {
      return this.get('value') || false; // Send `false` instead of null
    },
    setExistingValue: function(x) {
      if (x != null) {
        return this.set('value', x);
      }
    },
    toText: function() {
      // These act as constants
      if (this.get('value')) {
        return 'Yes';
      } else {
        return 'No';
      }
    }
  });

  FormRenderer.Views.ResponseFieldConfirm = FormRenderer.Views.ResponseField.extend({
    wrapper: 'none',
    field_type: 'confirm'
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
        year = 2000; // Just a dummy constant
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

  FormRenderer.Views.ResponseFieldDate = FormRenderer.Views.ResponseField.extend({
    wrapper: 'fieldset',
    field_type: 'date'
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

  FormRenderer.Views.ResponseFieldDropdown = FormRenderer.Views.ResponseField.extend({
    field_type: 'dropdown'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldEmail = FormRenderer.Models.ResponseField.extend({
    valueType: 'string',
    field_type: 'email',
    validateType: function() {
      if (!this.get('value').match(FormRenderer.EMAIL_REGEX)) {
        return 'email';
      }
    }
  });

  FormRenderer.Views.ResponseFieldEmail = FormRenderer.Views.ResponseField.extend({
    field_type: 'email'
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
          return `.${x}`;
        });
      }
    },
    getValue: function() {
      return this.getFiles();
    },
    maxFiles: function() {
      if (this.get('allow_multiple_files')) {
        return 50;
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
      // While label is "disabled", don't open the filepicker
      this.$label.on('click', function(e) {
        if ($(this).hasClass('disabled')) {
          return e.preventDefault();
        }
      });
      // When the input is tabbed to, highlight the label so it's visible
      this.$input.on('focus', () => {
        return this.$label.addClass('highlight');
      });
      this.$input.on('blur', () => {
        return this.$label.removeClass('highlight');
      });
      if (this.form_renderer) {
        this.$input.inlineFileUpload({
          method: 'post',
          action: `${this.form_renderer.options.screendoorBase}/api/form_renderer/file`,
          ajaxOpts: {
            headers: this.form_renderer.serverHeaders
          },
          additionalParams: {
            project_id: this.form_renderer.options.project_id,
            response_field_id: this.model.get('id'),
            v: 0
          },
          start: (data) => {
            uploadingFilename = data.filename;
            this.$label.addClass('disabled');
            this.$label.text(FormRenderer.t.uploading);
            return this.form_renderer.requests += 1;
          },
          progress: (data) => {
            return this.$label.text(data.percent === 100 ? FormRenderer.t.finishing_up : `${FormRenderer.t.uploading} (${data.percent}%)`);
          },
          complete: () => {
            return this.form_renderer.requests -= 1;
          },
          success: (data) => {
            this.model.addFile(data.data.file_id, uploadingFilename);
            return this.render();
          },
          error: (data) => {
            var errorText, ref;
            this.render();
            errorText = (ref = data.xhr.responseJSON) != null ? ref.errors : void 0;
            this.$error.text(errorText || FormRenderer.t.error).show();
            return setTimeout(() => {
              return this.$error.hide();
            }, 2000);
          }
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
    },
    shouldPersistValue: function() {
      var ref;
      if ((ref = this.fr) != null ? ref.isRenderingFollowUpForm() : void 0) {
        return false;
      } else {
        return FormRenderer.Models.ResponseField.prototype.shouldPersistValue.apply(this, arguments);
      }
    },
    getValue: function() {
      var ref;
      if ((ref = this.fr) != null ? ref.isRenderingFollowUpForm() : void 0) {
        return null;
      } else {
        return FormRenderer.Models.ResponseField.prototype.getValue.apply(this, arguments);
      }
    }
  });

  FormRenderer.Views.ResponseFieldIdentification = FormRenderer.Views.ResponseField.extend({
    field_type: 'identification',
    // Used internally by the Screendoor Formbuilder
    disableInput: function() {
      return this.isInputDisabled = true;
    },
    dontRenderInputs: function() {
      var ref;
      return !!this.isInputDisabled || ((ref = this.form_renderer) != null ? ref.isRenderingFollowUpForm() : void 0);
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
        var ref;
        this.refreshing = true;
        if ((ref = this.map) != null) {
          ref._onResize();
        }
        return setTimeout(() => {
          return this.refreshing = false;
        }, 0);
      });
    },
    render: function() {
      FormRenderer.Views.ResponseField.prototype.render.apply(this, arguments);
      this.$cover = this.$el.find('.fr_map_cover');
      FormRenderer.loadLeaflet(() => {
        this.initMap();
        if (this.model.latLng()) {
          return this.enable();
        }
      });
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
      // We're just refreshing the leaflet map, not actually saving anything
      if (this.refreshing) {
        return;
      }
      center = this.map.getCenter();
      this.marker.setLatLng(center);
      this.model.set({
        value: [center.lat.toFixed(7), center.lng.toFixed(7)]
      });
      // Rivets doesn't bind to arrays properly
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
    valueType: 'string',
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
        digits = `${digitsInt}`.length;
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

  FormRenderer.Views.ResponseFieldPageBreak = FormRenderer.Views.ResponseField.extend({
    field_type: 'page_break'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldParagraph = FormRenderer.Models.ResponseField.extend({
    field_type: 'paragraph'
  });

  FormRenderer.Views.ResponseFieldParagraph = FormRenderer.Views.ResponseField.extend({
    field_type: 'paragraph'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldPhone = FormRenderer.Models.ResponseField.extend({
    field_type: 'phone',
    valueType: 'string',
    validateType: function() {
      var digitsOnly, isUs, minDigits, ref;
      isUs = this.get('phone_format') === 'us';
      // For US phone numbers, we validate the full 10-digit number.
      // For international numbers, our validation errs on relaxation :D
      minDigits = isUs ? 10 : 7;
      digitsOnly = ((ref = this.get('value').match(/\d/g)) != null ? ref.join('') : void 0) || '';
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
      return `${this.getValue().dollars || '0'}.${this.getValue().cents || '00'}`;
    },
    validateType: function() {
      var values;
      values = [];
      if (this.get('value.dollars')) {
        values.push(`${this.get('value.dollars')}`.replace(/,/g, '').replace(/^\$/, ''));
      }
      if (this.get('value.cents')) {
        values.push(`${this.get('value.cents')}`);
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
        return this.model.set('value.cents', `0${cents}`);
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldRadio = FormRenderer.Models.ResponseFieldCheckboxes.extend({
    field_type: 'radio',
    wrapper: 'fieldset'
  });

  FormRenderer.Views.ResponseFieldRadio = FormRenderer.Views.ResponseField.extend({
    wrapper: 'fieldset',
    field_type: 'radio'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldSectionBreak = FormRenderer.Models.NonInputResponseField.extend({
    field_type: 'section_break'
  });

  FormRenderer.Views.ResponseFieldSectionBreak = FormRenderer.Views.ResponseField.extend({
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
      return this.numRows() < this.maxRows();
    },
    minRows: function() {
      return parseInt(this.get('minrows'), 10) || 0;
    },
    maxRows: function() {
      if (this.get('maxrows')) {
        return parseInt(this.get('maxrows'), 10) || 2e308;
      } else {
        return 2e308;
      }
    },
    // The server sends us data like this:
    //   { 'column' => ['a', 'b'], 'column two' => ['c', 'd'] }

    // Transform it to this:
    //   [['a', 'b'], ['c', 'd']]
    setExistingValue: function(x) {
      var existingNumRows, ref;
      existingNumRows = Math.max(this.minRows(), ((ref = _.values(x)[0]) != null ? ref.length : void 0) || 0, 1);
      return this.set('value', _.tap([], (arr) => {
        var colArr, column, k, len, ref1, ref2, results;
        ref1 = this.getColumns();
        results = [];
        for (k = 0, len = ref1.length; k < len; k++) {
          column = ref1[k];
          // Copy preset value *or* existing value to model
          colArr = _.map((function() {
            var results1 = [];
            for (var l = 0, ref2 = existingNumRows - 1; 0 <= ref2 ? l <= ref2 : l >= ref2; 0 <= ref2 ? l++ : l--){ results1.push(l); }
            return results1;
          }).apply(this), (i) => {
            var ref3;
            return this.getPresetValue(column.label, i) || (x != null ? (ref3 = x[column.label]) != null ? ref3[i] : void 0 : void 0);
          });
          results.push(arr.push(colArr));
        }
        return results;
      }));
    },
    numRows: function() {
      var value;
      value = this.get('value');
      if ((value != null) && value.length) {
        return Math.max(this.minRows(), value[0].length || 0, 1);
      } else {
        return 0;
      }
    },
    // Ignore preset values when calculating hasValue
    hasValue: function() {
      return _.some(this.getValue(), (colVals, colLabel) => {
        return _.some(colVals, (v, idx) => {
          return !this.getPresetValue(colLabel, idx) && !!v;
        });
      });
    },
    getPresetValue: function(columnLabel, row) {
      var ref, ref1;
      return (ref = this.get('preset_values')) != null ? (ref1 = ref[columnLabel]) != null ? ref1[row] : void 0 : void 0;
    },
    // We have data like this:
    //   [['a', 'b'], ['c', 'd']]

    // The server wants data like this:
    //   { 'column' => ['a', 'b'], 'column two' => ['c', 'd'] }
    getValue: function() {
      return _.tap({}, (h) => {
        var column, i, j, k, len, ref, results;
        ref = this.getColumns();
        results = [];
        for (j = k = 0, len = ref.length; k < len; j = ++k) {
          column = ref[j];
          h[column.label] = [];
          results.push((function() {
            var l, ref1, results1;
            results1 = [];
            for (i = l = 0, ref1 = this.numRows() - 1; (0 <= ref1 ? l <= ref1 : l >= ref1); i = 0 <= ref1 ? ++l : --l) {
              results1.push(h[column.label].push(this.get(`value.${j}.${i}`) || ''));
            }
            return results1;
          }).call(this));
        }
        return results;
      });
    },
    toText: function() {
      return _.flatten(_.values(this.getValue())).join(' ');
    },
    calculateColumnTotals: function() {
      var column, columnSum, columnVals, i, j, k, l, len, ref, ref1, results;
      ref = this.getColumns();
      results = [];
      for (j = k = 0, len = ref.length; k < len; j = ++k) {
        column = ref[j];
        columnVals = [];
        for (i = l = 0, ref1 = this.numRows() - 1; (0 <= ref1 ? l <= ref1 : l >= ref1); i = 0 <= ref1 ? ++l : --l) {
          columnVals.push(parseFloat((this.get(`value.${j}.${i}`) || '').replace(/\$?,?/g, '')));
        }
        columnSum = _.reduce(columnVals, function(memo, num) {
          if (_.isNaN(num)) {
            return memo;
          } else {
            return memo + num;
          }
        }, 0);
        results.push(this.set(`columnTotals.${j}`, this.formatColumnSum(columnSum)));
      }
      return results;
    },
    formatColumnSum: function(num) {
      var parsed, precision, ref;
      if (num > 0) {
        parsed = parseFloat(num.toFixed(10));
        precision = ((ref = `${parsed}`.split('.')[1]) != null ? ref.length : void 0) || 0;
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
      var col, newVal, ref, vals;
      e.preventDefault();
      newVal = {};
      ref = this.model.get('value');
      for (col in ref) {
        vals = ref[col];
        newVal[col] = vals.concat('');
      }
      this.model.set('value', newVal);
      return this.render();
    },
    // Loop through rows, decreasing index for rows above the current row
    removeRow: function(e) {
      var col, idx, newVal, ref, vals;
      e.preventDefault();
      idx = $(e.currentTarget).closest('[data-row-index]').data('row-index');
      newVal = {};
      ref = this.model.get('value');
      for (col in ref) {
        vals = ref[col];
        newVal[col] = _.tap([], function(arr) {
          var i, results, val;
          results = [];
          for (i in vals) {
            val = vals[i];
            if (parseInt(i, 10) !== idx) {
              // if i == idx, this is the row being removed
              results.push(arr.push(val));
            } else {
              results.push(void 0);
            }
          }
          return results;
        });
      }
      this.model.set('value', newVal);
      return this.render();
    }
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldText = FormRenderer.Models.ResponseField.extend({
    field_type: 'text',
    valueType: 'string'
  });

  FormRenderer.Views.ResponseFieldText = FormRenderer.Views.ResponseField.extend({
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
      return `${this.getValue().hours || '00'}:${this.getValue().minutes || '00'}:${this.getValue().seconds || '00'} ${this.getValue().am_pm}`;
    },
    validateType: function() {
      var hours, minutes, seconds;
      hours = parseInt(this.get('value.hours'), 10);
      minutes = parseInt(this.get('value.minutes'), 10);
      seconds = parseInt(this.get('value.seconds'), 10) || 0;
      if (!(((1 <= hours && hours <= 12)) && ((0 <= minutes && minutes <= 59)) && ((0 <= seconds && seconds <= 59)))) {
        return 'time';
      }
    }
  });

  FormRenderer.Views.ResponseFieldTime = FormRenderer.Views.ResponseField.extend({
    wrapper: 'fieldset',
    field_type: 'time'
  });

}).call(this);

(function() {
  FormRenderer.Models.ResponseFieldWebsite = FormRenderer.Models.ResponseField.extend({
    field_type: 'website',
    valueType: 'string'
  });

  FormRenderer.Views.ResponseFieldWebsite = FormRenderer.Views.ResponseField.extend({
    field_type: 'website'
  });

}).call(this);

(function() {
  var FieldValidation;

  FieldValidation = {
    validateType: function() {},
    validationFns: ['validateType', 'validateInteger', 'validateLength', 'validateMinMax'],
    validateComponent: function(opts = {}) {
      var errorIs, errorKey, errorWas, i, len, ref, validationFn;
      errorWas = this.get('error');
      this.errors = [];
      if (!(this.isVisible && !this.parentGroupIsHidden())) {
        return;
      }
      if (!this.hasValue()) {
        if (this.isRequired()) {
          this.errors.push(FormRenderer.t.errors.blank);
        }
      } else {
        ref = this.validationFns;
        // If value is present, run all the other validators
        for (i = 0, len = ref.length; i < len; i++) {
          validationFn = ref[i];
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
      var ref;
      return ((ref = this.field_type) === 'text' || ref === 'paragraph') && (this.get('minlength') || this.get('maxlength'));
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
      var ref;
      return ((ref = this.field_type) === 'number' || ref === 'price') && (this.get('min') || this.get('max'));
    },
    validateMinMax: function() {
      var max, min, value;
      if (!this.hasMinMaxValidation()) {
        return;
      }
      min = this.get('min') && parseFloat(this.get('min'));
      max = this.get('max') && parseFloat(this.get('max'));
      value = this.field_type === 'price' ? parseFloat(`${this.get('value.dollars') || 0}.${this.get('value.cents') || 0}`) : parseFloat(this.get('value').replace(/,/g, ''));
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
  var FieldView;

  FieldView = {
    _sharedInitialize: function(options) {
      ({form_renderer: this.form_renderer, model: this.model} = options);
      if (this.model.id) {
        this.$el.addClass(`fr_response_field_${this.model.id}`);
      }
      return this.showLabels = this.form_renderer ? this.form_renderer.options.showLabels : this.showLabels = options.showLabels;
    },
    reflectConditions: function() {
      if (this.model.isVisible) {
        return this.$el.show();
      } else {
        return this.$el.hide();
      }
    },
    domId: function() {
      return this.model.cid;
    },
    // This method has been deprecated and is only around to alias to domId() for backwards-compatibility.
    getDomId: function() {
      return domId;
    }
  };

  _.extend(FormRenderer.Views.ResponseFieldRepeatingGroup.prototype, FieldView);

  _.extend(FormRenderer.Views.ResponseField.prototype, FieldView);

}).call(this);

(function() {
  // Must implement:
  //  - reflectConditions()
  var HasComponents;

  HasComponents = {
    getValue: function() {
      return _.tap({}, (h) => {
        return this.formComponents.each(function(c) {
          if (c.shouldPersistValue()) {
            return h[c.get('id')] = c.getValue();
          }
        });
      });
    },
    initFormComponents: function(fieldData, responseData) {
      var field, i, len, model;
      this.formComponents = new Backbone.Collection();
      // @response_fields has been deprecated as of October 2017 in favor of using
      // @formComponents instead, but is still temporarily included for the sake of
      // backwards-compatibility.
      this.response_fields = this.formComponents;
      for (i = 0, len = fieldData.length; i < len; i++) {
        field = fieldData[i];
        model = FormRenderer.buildFormComponentModel(field, this.fr, this);
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
        return `${condition.response_field_id}` === `${rf.id}`;
      });
    },
    runConditions: function(rf) {
      var needsRender;
      needsRender = false;
      _.each(this.conditionsForResponseField(rf), function(c) {
        if (c.parent.calculateVisibilityIsChanged()) {
          return needsRender = true;
        }
      });
      if (needsRender) {
        return this.reflectConditions();
      }
    }
  };

  _.extend(FormRenderer.prototype, HasComponents);

  _.extend(FormRenderer.Models.ResponseFieldRepeatingGroupEntry.prototype, HasComponents);

}).call(this);

(function() {
  FormRenderer.Plugins.Base = class Base {
    constructor(fr) {
      this.fr = fr;
    }

  };

}).call(this);

(function() {
  FormRenderer.Plugins.Autosave = class Autosave extends FormRenderer.Plugins.Base {
    afterFormLoad() {
      return setInterval(() => {
        if (this.fr.state.get('hasChanges')) {
          return this.fr.save();
        }
      }, 5000);
    }

  };

}).call(this);

(function() {
  var getUrlParam, paramName;

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

  FormRenderer.Plugins.BookmarkDraft = class BookmarkDraft extends FormRenderer.Plugins.Base {
    beforeFormLoad() {
      var id;
      if ((id = getUrlParam(paramName))) {
        return this.fr.options.response.id = id;
      }
    }

    afterFormLoad() {
      this.fr.subviews.bookmarkDraft = new FormRenderer.Plugins.BookmarkDraft.View({
        form_renderer: this.fr
      });
      return this.fr.$el.append(this.fr.subviews.bookmarkDraft.render().el);
    }

  };

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
      u = new Url();
      u.query[paramName] = this.form_renderer.options.response.id;
      return u.toString();
    },
    requestBookmark: function(e) {
      var cb;
      e.preventDefault();
      cb = () => {
        this.render();
        return this.showBookmark(this.getUrl());
      };
      if (this.form_renderer.options.response.id) {
        return cb();
      } else {
        this.$el.find('a').text(FormRenderer.t.saving);
        return this.form_renderer.waitForRequests(() => {
          if (this.form_renderer.options.response.id) {
            return cb();
          } else {
            return this.form_renderer.save({
              cb: cb
            });
          }
        });
      }
    }
  });

}).call(this);

(function() {
  FormRenderer.Plugins.BottomBar = class BottomBar extends FormRenderer.Plugins.Base {
    afterFormLoad() {
      this.fr.subviews.bottomBar = new FormRenderer.Plugins.BottomBar.View({
        form_renderer: this.fr
      });
      return this.fr.$el.append(this.fr.subviews.bottomBar.render().el);
    }

  };

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
  FormRenderer.Plugins.ErrorBar = class ErrorBar extends FormRenderer.Plugins.Base {
    afterFormLoad() {
      this.fr.subviews.errorBar = new FormRenderer.Plugins.ErrorBar.View({
        form_renderer: this.fr
      });
      return this.fr.$el.prepend(this.fr.subviews.errorBar.render().el);
    }

  };

  FormRenderer.Plugins.ErrorBar.View = Backbone.View.extend({
    events: {
      'click a': function(e) {
        e.preventDefault();
        return this.form_renderer.focusFirstError();
      }
    },
    initialize: function(options) {
      this.form_renderer = options.form_renderer;
      this.listenTo(this.form_renderer, 'afterValidate:all', () => {
        this.render();
        return this.$el.find('.fr_error_alert_bar a').focus();
      });
      // When validating a single field, we only go from shown -> hidden
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
  FormRenderer.Plugins.PageState = class PageState extends FormRenderer.Plugins.Base {
    afterFormLoad() {
      var num, page, ref;
      if (num = (ref = window.location.hash.match(/page([0-9]+)/)) != null ? ref[1] : void 0) {
        page = parseInt(num, 10);
        if (this.fr.isPageVisible(page)) {
          this.fr.activatePage(page);
        }
      }
      return this.fr.state.on('change:activePage', function(_, num) {
        return window.location.hash = `page${num}`;
      });
    }

  };

}).call(this);

(function() {
  FormRenderer.Plugins.SavedSession = class SavedSession extends FormRenderer.Plugins.Base {
    beforeFormLoad() {
      var base, cookieKey, draftKey;
      draftKey = `project-${this.fr.options.project_id}-response-id`;
      // We only want to grab a response ID from the cookie if we haven't already
      // generated one from within FormRenderer (i.e. on a first-time page load).
      // In this situation, the Cookies object is actually an object that only
      // contains a `remove` method, and calling `get` on it throws an exception.
      if (this.fr.options.response.id == null) {
        cookieKey = Cookies.get(draftKey);
      }
      // If we got a key from the cookie, we want to make sure it's a valid one
      // before setting it as our response ID. If it's invalid, we clear the cookie
      // and leave the response ID unset so we can generate one within FormRenderer.
      if (cookieKey != null) {
        if (cookieKey.indexOf(',') !== -1) {
          (base = this.fr.options.response).id || (base.id = cookieKey);
        } else {
          Cookies.remove(draftKey);
        }
      }
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
    }

  };

}).call(this);

(function() {
  FormRenderer.Plugins.WarnBeforeUnload = class WarnBeforeUnload extends FormRenderer.Plugins.Base {
    afterFormLoad() {
      return BeforeUnload.enable({
        if: () => {
          return this.fr.state.get('hasChanges');
        }
      });
    }

  };

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
      var i, len, ref, rf, view;
      this.hide();
      ref = this.models;
      for (i = 0, len = ref.length; i < len; i++) {
        rf = ref[i];
        view = FormRenderer.buildFormComponentView(rf, this.form_renderer);
        this.$el.append(view.render().el);
        view.reflectConditions();
        this.views.push(view);
      }
      return this;
    },
    hide: function() {
      var i, len, ref, results, view;
      this.$el.hide();
      ref = this.views;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        view = ref[i];
        results.push(view.trigger('hidden'));
      }
      return results;
    },
    show: function() {
      var i, len, ref, results, view;
      this.$el.show();
      ref = this.views;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        view = ref[i];
        results.push(view.trigger('shown'));
      }
      return results;
    },
    reflectConditions: function() {
      var i, len, ref, results, view;
      ref = this.views;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        view = ref[i];
        results.push(view.reflectConditions());
      }
      return results;
    },
    validate: function() {
      var component, i, len, ref, results;
      ref = this.models;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        component = ref[i];
        results.push(component.validateComponent());
      }
      return results;
    },
    fieldViews: function() {
      return _.tap([], (arr) => {
        var entry, fieldView, i, len, ref, results, view;
        ref = this.views;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          view = ref[i];
          if (view.model.group) {
            if (!view.model.isSkipped()) {
              results.push((function() {
                var j, len1, ref1, results1;
                ref1 = view.model.entries;
                results1 = [];
                for (j = 0, len1 = ref1.length; j < len1; j++) {
                  entry = ref1[j];
                  results1.push((function() {
                    var k, len2, ref2, results2;
                    ref2 = entry.view.views;
                    results2 = [];
                    for (k = 0, len2 = ref2.length; k < len2; k++) {
                      fieldView = ref2[k];
                      results2.push(arr.push(fieldView));
                    }
                    return results2;
                  })());
                }
                return results1;
              })());
            } else {
              results.push(void 0);
            }
          } else {
            results.push(arr.push(view));
          }
        }
        return results;
      });
    },
    firstViewWithError: function() {
      return _.find(this.fieldViews(), function(view) {
        return view.model.errors.length > 0;
      });
    },
    isVisible: function() {
      return _.any(this.models, function(rf) {
        return rf.isVisible;
      });
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
      ({form_renderer: this.form_renderer} = options);
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
var FormRendererEN = {"address":"Address","add_another":"Add another","answer":"Answer this question","back_to_page":"Back to page :num","blind":"Blind","bookmark_hint":"To finish your response later, copy the link below.","cents":"Cents","characters":"characters","choose_an_option":"Choose an option","city":"City","clear":"Clear","click_to_set":"Click to set location","coordinates":"Coordinates","country":"Country","dollars":"Dollars","email":"Email","enter_at_least":"Enter at least :min","enter_between":"Enter between :min and :max","enter_exactly":"Enter :num","enter_up_to":"Enter up to :max","error":"Error","errors":{"blank":"This field can't be blank.","date":"Please enter a valid date.","email":"Please enter a valid email address.","identification":"Please enter your name and email address.","integer":"Please enter a whole number.","large":"Your answer is too large.","long":"Your answer is too long.","number":"Please enter a valid number.","phone":"Please enter a valid phone number.","price":"Please enter a valid price.","short":"Your answer is too short.","small":"Your answer is too small.","time":"Please enter a valid time.","us_phone":"Please enter a valid 10-digit phone number."},"error_bar":{"errors":"Your response has <a href='#'>validation errors</a>."},"error_filename":"Error reading filename","error_loading":"Error loading form","error_saving":"Error saving","finishing_up":"Finishing up...","finish_later":"Finish this later","has_conditions":"Has conditions","hidden":"Hidden","loading_form":"Loading form...","na":"N/A","name":"Name","next_page":"Next page","not_supported":"Sorry, your browser does not support this embedded form. Please visit <a href=':url?fr_not_supported=t'>:url</a> to fill out this form.","other":"Other","postal_code":"Postal Code","province":"Province","remove":"Remove","saved":"Saved","saving":"Saving...","skip":"Skip this question","skipped":"This question is skipped.","state":"State","state_province_region":"State / Province / Region","submit":"Submit","submitting":"Submitting","thanks":"Thanks for submitting our form!","upload":"Upload a file","uploading":"Uploading...","upload_another":"Upload another file","we_accept":"We'll accept","words":"words","write_here":"Write your answer here","zip_code":"ZIP Code"};
if (typeof FormRenderer !== 'undefined') FormRenderer.t = FormRendererEN;
if (!window.JST) {
  window.JST = {};
}
window.JST["fields/address"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var format, i, j, len, len1, ref, ref1, ref2, x;
    
      format = this.model.get('address_format');
    
      __out.push('\n\n');
    
      if (format !== 'city_state' && format !== 'city_state_zip' && format !== 'country') {
        __out.push('\n  <div class=\'fr_grid\'>\n    <div class=\'fr_full has_sub_label\'>\n      <label class="fr_sub_label" for=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('_street\'>');
        __out.push(__sanitize(FormRenderer.t.address));
        __out.push('</label>\n      <input type="text"\n             id="');
        __out.push(__sanitize(this.domId()));
        __out.push('_street"\n             data-rv-input=\'model.value.street\' />\n    </div>\n  </div>\n');
      }
    
      __out.push('\n\n');
    
      if (format !== 'country') {
        __out.push('\n  <div class=\'fr_grid\'>\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('_city\'>');
        __out.push(__sanitize(FormRenderer.t.city));
        __out.push('</label>\n      <input type="text"\n             data-rv-input=\'model.value.city\'\n             id=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('_city\' />\n    </div>\n\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('_state\'>\n        ');
        if (this.model.get('value.country') === 'US') {
          __out.push('\n          ');
          __out.push(__sanitize(FormRenderer.t.state));
          __out.push('\n        ');
        } else if (this.model.get('value.country') === 'CA') {
          __out.push('\n          ');
          __out.push(__sanitize(FormRenderer.t.province));
          __out.push('\n        ');
        } else {
          __out.push('\n          ');
          __out.push(__sanitize(FormRenderer.t.state_province_region));
          __out.push('\n        ');
        }
        __out.push('\n      </label>\n\n      ');
        if ((ref = this.model.get('value.country')) === 'US' || ref === 'CA') {
          __out.push('\n        <select data-rv-value=\'model.value.state\' data-width=\'100%\' id=\'');
          __out.push(__sanitize(this.domId()));
          __out.push('_state\'>\n          <option></option>\n          ');
          ref1 = FormRenderer["PROVINCES_" + (this.model.get('value.country'))];
          for (i = 0, len = ref1.length; i < len; i++) {
            x = ref1[i];
            __out.push('\n            <option value=\'');
            __out.push(__sanitize(x));
            __out.push('\'>');
            __out.push(__sanitize(x));
            __out.push('</option>\n          ');
          }
          __out.push('\n        </select>\n      ');
        } else {
          __out.push('\n        <input type="text" data-rv-input=\'model.value.state\' id=\'');
          __out.push(__sanitize(this.domId()));
          __out.push('_state\' />\n      ');
        }
        __out.push('\n    </div>\n  </div>\n');
      }
    
      __out.push('\n\n<div class=\'fr_grid\'>\n  ');
    
      if (format !== 'city_state' && format !== 'country') {
        __out.push('\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('_zipcode\'>\n        ');
        if (this.model.get('value.country') === 'US') {
          __out.push('\n          ');
          __out.push(__sanitize(FormRenderer.t.zip_code));
          __out.push('\n        ');
        } else {
          __out.push('\n          ');
          __out.push(__sanitize(FormRenderer.t.postal_code));
          __out.push('\n        ');
        }
        __out.push('\n      </label>\n      <input type="text"\n             data-rv-input=\'model.value.zipcode\'\n             id=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('_zipcode\' />\n    </div>\n  ');
      }
    
      __out.push('\n\n  ');
    
      if (format !== 'city_state' && format !== 'city_state_zip') {
        __out.push('\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('_country\'>');
        __out.push(__sanitize(FormRenderer.t.country));
        __out.push('</label>\n      <select data-rv-value=\'model.value.country\' data-width=\'100%\' id=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('_country\'>\n        ');
        ref2 = FormRenderer.ORDERED_COUNTRIES;
        for (j = 0, len1 = ref2.length; j < len1; j++) {
          x = ref2[j];
          __out.push('\n          <option value=\'');
          __out.push(__sanitize(x));
          __out.push('\'>');
          __out.push(__sanitize(ISOCountryNames[x] || '---'));
          __out.push('</option>\n        ');
        }
        __out.push('\n      </select>\n    </div>\n  ');
      }
    
      __out.push('\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/block_of_text"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push(JST["partials/labels"](this));
    
      __out.push('\n\n<div class=\'fr_text size_');
    
      __out.push(__sanitize(this.model.getSize()));
    
      __out.push('\'>\n  ');
    
      __out.push(__sanitize(this.safe(FormRenderer.formatAndSanitizeHTML(this.model.get('description')))));
    
      __out.push('\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/checkboxes"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var i, len, option, ref;
    
      ref = this.model.getOptions();
      for (i = 0, len = ref.length; i < len; i++) {
        option = ref[i];
        __out.push('\n  <label class=\'fr_option control\'>\n    <input type=\'checkbox\' data-rv-checkedarray=\'model.value.checked\' value="');
        __out.push(__sanitize(option.label));
        __out.push('" />\n    ');
        __out.push(__sanitize(option.translated_label || option.label));
        __out.push('\n  </label>\n');
      }
    
      __out.push('\n\n');
    
      if (this.model.get('include_other_option')) {
        __out.push('\n  <div class=\'fr_option fr_other_option\'>\n    <label class=\'control\'>\n      <input type=\'checkbox\' data-rv-checked=\'model.value.other_checked\' />\n      ');
        __out.push(__sanitize(FormRenderer.t.other));
        __out.push('\n    </label>\n\n    <input type=\'text\'\n           data-rv-show=\'model.value.other_checked\'\n           data-rv-input=\'model.value.other_text\'\n           placeholder=\'');
        __out.push(__sanitize(FormRenderer.t.write_here));
        __out.push('\' />\n  </div>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/confirm"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<label class=\'fr_option control\'>\n  <input type=\'checkbox\' data-rv-checked=\'model.value\' />\n  ');
    
      __out.push(__sanitize(this.model.get('label')));
    
      __out.push(JST["partials/required"](this));
    
      __out.push('\n</label>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/date"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_grid\'>\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_month">MM</label>\n    <input type="text"\n           id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_month"\n           data-rv-input=\'model.value.month\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_spacer\'>/</div>\n\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_day">DD</label>\n    <input type="text"\n           data-rv-input=\'model.value.day\'\n           maxlength=\'2\'\n           size=\'2\'\n           id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_day" />\n  </div>\n\n  ');
    
      if (!this.model.get('disable_year')) {
        __out.push('\n    <div class=\'fr_spacer\'>/</div>\n\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="');
        __out.push(__sanitize(this.domId()));
        __out.push('_year">YYYY</label>\n      <input type="text"\n             data-rv-input=\'model.value.year\'\n             maxlength=\'4\'\n             size=\'4\'\n             id="');
        __out.push(__sanitize(this.domId()));
        __out.push('_year" />\n    </div>\n  ');
      }
    
      __out.push('\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/dropdown"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var i, len, option, ref;
    
      __out.push('<select id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('" data-rv-value=\'model.value\'>\n  ');
    
      if (this.model.get('include_blank_option')) {
        __out.push('\n    <option selected value="">\n      ');
        __out.push(__sanitize(FormRenderer.t.choose_an_option));
        __out.push('\n    </option>\n  ');
      }
    
      __out.push('\n\n  ');
    
      ref = this.model.getOptions();
      for (i = 0, len = ref.length; i < len; i++) {
        option = ref[i];
        __out.push('\n    <option value="');
        __out.push(__sanitize(option.label));
        __out.push('">\n      ');
        __out.push(__sanitize(option.translated_label || option.label));
        __out.push('\n    </option>\n  ');
      }
    
      __out.push('\n</select>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/email"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<input type="text" inputmode="email"\n       id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('"\n       data-rv-input=\'model.value\' />\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/file"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var attachment, exts, i, len, ref;
    
      __out.push('<div class=\'fr_files\'>\n  ');
    
      ref = this.model.getFiles();
      for (i = 0, len = ref.length; i < len; i++) {
        attachment = ref[i];
        __out.push('\n    <div class=\'fr_file\'>\n      <span>');
        __out.push(__sanitize(attachment.filename));
        __out.push('</span>\n      <button data-fr-remove-file class=\'');
        __out.push(__sanitize(FormRenderer.BUTTON_CLASS));
        __out.push('\'>');
        __out.push(__sanitize(FormRenderer.t.remove));
        __out.push('</button>\n    </div>\n  ');
      }
    
      __out.push('\n</div>\n\n');
    
      if (this.model.canAddFile()) {
        __out.push('\n  <div class=\'fr_add_file\'>\n    <label for=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('\' class=\'');
        __out.push(__sanitize(FormRenderer.BUTTON_CLASS));
        __out.push('\'>\n      ');
        __out.push(__sanitize(this.model.getFiles().length ? FormRenderer.t.upload_another : FormRenderer.t.upload));
        __out.push('\n    </label>\n\n    <input type=\'file\'\n           id=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('\'\n           ');
        if ((exts = this.model.getAcceptedExtensions())) {
          __out.push('\n            accept=\'');
          __out.push(__sanitize(exts.join(',')));
          __out.push('\'\n           ');
        }
        __out.push('\n           />\n\n    <span class=\'fr_error\' style=\'display:none\'></span>\n\n    ');
        if ((exts = this.model.getAcceptedExtensions())) {
          __out.push('\n      <div class=\'fr_description\'>\n        ');
          __out.push(__sanitize(FormRenderer.t.we_accept));
          __out.push(' ');
          __out.push(__sanitize(_str.toSentence(exts)));
          __out.push('\n      </div>\n    ');
        }
        __out.push('\n  </div>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/identification"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_grid\'>\n  <div class=\'fr_half\'>\n    <label for=\'');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('-name\'>\n      ');
    
      __out.push(__sanitize(FormRenderer.t.name));
    
      __out.push('\n\n      ');
    
      if (!this.dontRenderInputs()) {
        __out.push('\n        <abbr class=\'fr_required\' title=\'required\'>*</abbr>\n      ');
      }
    
      __out.push('\n    </label>\n\n    ');
    
      if (this.dontRenderInputs()) {
        __out.push('\n      <span>');
        __out.push(__sanitize(this.model.get('value.name')));
        __out.push('</span>\n    ');
      } else {
        __out.push('\n      <input type=\'text\'\n             id=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('-name\'\n             data-rv-input=\'model.value.name\' />\n    ');
      }
    
      __out.push('\n  </div>\n\n  <div class=\'fr_half\'>\n    <label for=\'');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('-email\'>\n      ');
    
      __out.push(__sanitize(FormRenderer.t.email));
    
      __out.push('\n      ');
    
      if (!this.dontRenderInputs()) {
        __out.push('\n        <abbr class=\'fr_required\' title=\'required\'>*</abbr>\n      ');
      }
    
      __out.push('\n    </label>\n\n    ');
    
      if (this.dontRenderInputs()) {
        __out.push('\n      <span>');
        __out.push(__sanitize(this.model.get('value.email')));
        __out.push('</span>\n    ');
      } else {
        __out.push('\n      <input type="text"\n             id=\'');
        __out.push(__sanitize(this.domId()));
        __out.push('-email\'\n             data-rv-input=\'model.value.email\' />\n    ');
      }
    
      __out.push('\n  </div>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/map_marker"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_map_wrapper\'>\n  <div class=\'fr_map_map\'>\n  \n  </div>\n\n  <div class=\'fr_map_cover\'>\n    ');
    
      __out.push(__sanitize(FormRenderer.t.click_to_set));
    
      __out.push('\n  </div>\n\n  <div class=\'fr_map_toolbar\'>\n    <div class=\'fr_map_coord\'>\n      <strong>');
    
      __out.push(__sanitize(FormRenderer.t.coordinates));
    
      __out.push(':</strong>\n      <span data-rv-show=\'model.value\'>\n        <span data-rv-text=\'model.value.0\'></span>,\n        <span data-rv-text=\'model.value.1\'></span>\n      </span>\n      <span data-rv-hide=\'model.value\' class=\'fr_map_no_location\'>');
    
      __out.push(__sanitize(FormRenderer.t.na));
    
      __out.push('</span>\n    </div>\n    <a class=\'fr_map_clear\' data-fr-clear-map data-rv-show=\'model.value\' href=\'#\'>');
    
      __out.push(__sanitize(FormRenderer.t.clear));
    
      __out.push('</a>\n  </div>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/number"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<input type="text"\n       id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('"\n       data-rv-input=\'model.value\'\n       class="size_');
    
      __out.push(__sanitize(this.calculateSize()));
    
      __out.push('" />\n\n');
    
      if (this.model.get('units')) {
        __out.push('\n  <span class=\'fr_units\'>\n    ');
        __out.push(__sanitize(this.model.get('units')));
        __out.push('\n  </span>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/page_break"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_page_break_inner\'>\n  Page break\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/paragraph"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<textarea\n   id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('"\n   class="size_');
    
      __out.push(__sanitize(this.model.getSize()));
    
      __out.push('"\n   data-rv-input=\'model.value\'\n>\n</textarea>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/phone"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<input type="text"\n       inputmode="tel"\n       id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('"\n       data-rv-input=\'model.value\'\n       placeholder="');
    
      __out.push(__sanitize(this.phonePlaceholder()));
    
      __out.push('" />\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/price"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_grid\'>\n  <div class=\'fr_spacer\'>$</div>\n\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_dollars">');
    
      __out.push(__sanitize(FormRenderer.t.dollars));
    
      __out.push('</label>\n    <input type="text"\n           id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_dollars"\n           data-rv-input=\'model.value.dollars\'\n           size=\'6\' />\n  </div>\n\n  ');
    
      if (!this.model.get('disable_cents')) {
        __out.push('\n    <div class=\'fr_spacer\'>.</div>\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="');
        __out.push(__sanitize(this.domId()));
        __out.push('_cents">');
        __out.push(__sanitize(FormRenderer.t.cents));
        __out.push('</label>\n      <input type="text"\n             data-rv-input=\'model.value.cents\'\n             maxlength=\'2\'\n             size=\'2\'\n             id="');
        __out.push(__sanitize(this.domId()));
        __out.push('_cents" />\n    </div>\n  ');
      }
    
      __out.push('\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/radio"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var i, len, option, ref;
    
      ref = this.model.getOptions();
      for (i = 0, len = ref.length; i < len; i++) {
        option = ref[i];
        __out.push('\n  <label class=\'fr_option control\'>\n    <input type=\'radio\'\n           data-rv-dobtradiogroup=\'model.value.checked\'\n           value="');
        __out.push(__sanitize(option.label));
        __out.push('"\n    />\n    ');
        __out.push(__sanitize(option.translated_label || option.label));
        __out.push('\n  </label>\n');
      }
    
      __out.push('\n\n');
    
      if (this.model.get('include_other_option')) {
        __out.push('\n  <div class=\'fr_option fr_other_option\'>\n    <label class=\'control\'>\n      <input type=\'radio\'\n             data-rv-dobtradiogroup=\'model.value.checked\'\n             class="js_other_option"\n      />\n      ');
        __out.push(__sanitize(FormRenderer.t.other));
        __out.push('\n    </label>\n\n    <input type=\'text\'\n           data-rv-show=\'model.value.other_checked\'\n           data-rv-input=\'model.value.other_text\'\n           placeholder=\'');
        __out.push(__sanitize(FormRenderer.t.write_here));
        __out.push('\'\n    />\n  </div>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/section_break"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var formattedDescription;
    
      __out.push(JST["partials/labels"](this));
    
      __out.push('\n\n');
    
      formattedDescription = FormRenderer.formatAndSanitizeHTML(this.model.get('description'));
    
      __out.push('\n<');
    
      __out.push(__sanitize(this.model.sizeToHeaderTag()));
    
      __out.push('>');
    
      __out.push(__sanitize(this.model.get('label')));
    
      __out.push('</');
    
      __out.push(__sanitize(this.model.sizeToHeaderTag()));
    
      __out.push('>\n');
    
      if (formattedDescription) {
        __out.push('\n  <div class=\'fr_text size_');
        __out.push(__sanitize(this.model.getSize()));
        __out.push('\'>\n    ');
        __out.push(__sanitize(this.safe(formattedDescription)));
        __out.push('\n  </div>\n');
      }
    
      __out.push('\n\n<hr />\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/table"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var column, i, j, k, l, len, len1, len2, m, n, ref, ref1, ref2, ref3;
    
      __out.push('<table class=\'fr_table\'>\n  <thead>\n    <tr>\n      ');
    
      ref = this.model.getColumns();
      for (k = 0, len = ref.length; k < len; k++) {
        column = ref[k];
        __out.push('\n        <th>');
        __out.push(__sanitize(column.translated_label || column.label));
        __out.push('</th>\n      ');
      }
    
      __out.push('\n\n      <th class=\'fr_table_col_remove\'></th>\n    </tr>\n  </thead>\n\n  <tbody>\n    ');
    
      for (i = l = 0, ref1 = this.model.numRows() - 1; 0 <= ref1 ? l <= ref1 : l >= ref1; i = 0 <= ref1 ? ++l : --l) {
        __out.push('\n      <tr data-row-index="');
        __out.push(__sanitize(i));
        __out.push('">\n        ');
        ref2 = this.model.getColumns();
        for (j = m = 0, len1 = ref2.length; m < len1; j = ++m) {
          column = ref2[j];
          __out.push('\n          ');
          if (this.model.getPresetValue(column.label, i)) {
            __out.push('\n            <td class=\'fr_table_preset\'>\n              <span data-rv-text=\'model.value.');
            __out.push(__sanitize(j));
            __out.push('.');
            __out.push(__sanitize(i));
            __out.push('\'></span>\n          ');
          } else {
            __out.push('\n            <td>\n              <textarea data-rv-input=\'model.value.');
            __out.push(__sanitize(j));
            __out.push('.');
            __out.push(__sanitize(i));
            __out.push('\'\n                        rows=\'1\'\n                        aria-label="');
            __out.push(__sanitize(column.translated_label || column.label));
            __out.push(' #');
            __out.push(__sanitize(i + 1));
            __out.push('"\n                        ');
            if (j === 0 && i === 0) {
              __out.push('id=\'');
              __out.push(__sanitize(this.domId()));
              __out.push('\'');
            }
            __out.push(' \n              >\n              </textarea>\n          ');
          }
          __out.push('\n          </td>\n        ');
        }
        __out.push('\n\n        <td class=\'fr_table_col_remove\'>\n          ');
        if (this.canRemoveRow(i)) {
          __out.push('\n            <a class=\'js-remove-row\' href=\'#\'>\n              ');
          __out.push(FormRenderer.REMOVE_ROW_ICON);
          __out.push('\n            </a>\n          ');
        }
        __out.push('\n        </td>\n      </tr>\n    ');
      }
    
      __out.push('\n  </tbody>\n\n  ');
    
      if (this.model.get('column_totals')) {
        __out.push('\n    <tfoot>\n      <tr>\n        ');
        ref3 = this.model.getColumns();
        for (j = n = 0, len2 = ref3.length; n < len2; j = ++n) {
          column = ref3[j];
          __out.push('\n          <td data-rv-text=\'model.columnTotals.');
          __out.push(__sanitize(j));
          __out.push('\'></td>\n        ');
        }
        __out.push('\n        <td class="fr_table_col_remove"></td>\n      </tr>\n    </tfoot>\n  ');
      }
    
      __out.push('\n</table>\n\n<div class=\'fr_table_add_row_wrapper\'>\n  ');
    
      if (this.model.canAddRows()) {
        __out.push('\n    <a class=\'js-add-row\' href=\'#\'>\n      ');
        __out.push(FormRenderer.ADD_ROW_ICON);
        __out.push('\n      ');
        __out.push(__sanitize(FormRenderer.t.add_another));
        __out.push('\n    </a>\n  ');
      }
    
      __out.push('\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/text"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<input type="text"\n       id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('"\n       class="size_');
    
      __out.push(__sanitize(this.model.getSize()));
    
      __out.push('"\n       data-rv-input=\'model.value\' />\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/time"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_grid\'>\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_hours">HH</label>\n    <input type="text"\n           id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_hours"\n           data-rv-input=\'model.value.hours\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_spacer\'>:</div>\n\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_minutes">MM</label>\n    <input type="text"\n           data-rv-input=\'model.value.minutes\'\n           maxlength=\'2\'\n           size=\'2\'\n           id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('_minutes" />\n  </div>\n\n  ');
    
      if (!this.model.get('disable_seconds')) {
        __out.push('\n    <div class=\'fr_spacer\'>:</div>\n\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="');
        __out.push(__sanitize(this.domId()));
        __out.push('_seconds">SS</label>\n      <input type="text"\n             data-rv-input=\'model.value.seconds\'\n             maxlength=\'2\'\n             size=\'2\'\n             id="');
        __out.push(__sanitize(this.domId()));
        __out.push('_seconds" />\n    </div>\n  ');
      }
    
      __out.push('\n\n  <div class=\'has_sub_label\'>\n    <select data-rv-value=\'model.value.am_pm\' data-width=\'auto\' aria-label=\'AM/PM\'>\n      <option value=\'AM\'>AM</option>\n      <option value=\'PM\'>PM</option>\n    </select>\n  </div>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["fields/website"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<input type="text" inputmode="url"\n       id="');
    
      __out.push(__sanitize(this.domId()));
    
      __out.push('"\n       data-rv-input=\'model.value\'\n       placeholder=\'http://\' />\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["main"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_loading\'>\n  ');
    
      __out.push(__sanitize(FormRenderer.t.loading_form));
    
      __out.push('\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/description"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      if (this.model.get('description')) {
        __out.push('\n  <div class=\'fr_description\'>\n    ');
        __out.push(__sanitize(this.safe(FormRenderer.formatAndSanitizeHTML(this.model.get('description')))));
        __out.push('\n  </div>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/email_sent"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<p>');
    
      __out.push(__sanitize(this.message));
    
      __out.push('</p>\n\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/error"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_error\' data-rv-show=\'model.error\' data-rv-text=\'model.error\'></div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/label"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<label ');
    
      if (this.model.group || this.model.wrapper === 'fieldset') {
        __out.push('aria-hidden="true"');
      } else {
        __out.push('for="');
        __out.push(__sanitize(this.domId()));
        __out.push('"');
      }
    
      __out.push('>\n  ');
    
      __out.push(__sanitize(this.model.get('label')));
    
      __out.push(JST["partials/required"](this));
    
      __out.push('\n  ');
    
      __out.push(JST["partials/labels"](this));
    
      __out.push('\n</label>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/labels"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      if (this.showLabels) {
        __out.push('\n  ');
        if (this.model.get('admin_only')) {
          __out.push('\n    <span class=\'label label_fb\'><i class=\'fa fa-lock\'></i>');
          __out.push(__sanitize(FormRenderer.t.hidden));
          __out.push('</span>\n  ');
        }
        __out.push('\n  ');
        if (this.model.get('blind')) {
          __out.push('\n    <span class=\'label label_fb\'><i class=\'fa fa-eye-slash\'></i> ');
          __out.push(__sanitize(FormRenderer.t.blind));
          __out.push('</span>\n  ');
        }
        __out.push('\n  ');
        if (this.model.isConditional()) {
          __out.push('\n    <span class=\'label label_fb\'><i class=\'fa fa-code-fork\'></i>');
          __out.push(__sanitize(FormRenderer.t.has_conditions));
          __out.push('</span>\n  ');
        }
        __out.push('\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/length_counter"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<span class=\'fr_length_counter\' data-rv-text=\'model.currentLength\'></span>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/length_validations"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var max, min, units;
    
      min = this.model.get('minlength');
    
      __out.push('\n');
    
      max = this.model.get('maxlength');
    
      __out.push('\n');
    
      units = this.model.getLengthValidationUnits();
    
      __out.push('\n\n');
    
      if (this.model.hasLengthValidation()) {
        __out.push('\n  <div class=\'fr_min_max\'>\n    <span class=\'fr_min_max_guide\'>\n      ');
        if (min && max) {
          __out.push('\n        ');
          if (min === max) {
            __out.push('\n          ');
            __out.push(__sanitize(FormRenderer.t.enter_exactly.replace(':num', min)));
            __out.push(' ');
            __out.push(__sanitize(FormRenderer.t[units]));
            __out.push('.\n        ');
          } else {
            __out.push('\n          ');
            __out.push(__sanitize(FormRenderer.t.enter_between.replace(':min', min).replace(':max', max)));
            __out.push(' ');
            __out.push(__sanitize(FormRenderer.t[units]));
            __out.push('.\n        ');
          }
          __out.push('\n      ');
        } else if (min) {
          __out.push('\n        ');
          __out.push(__sanitize(FormRenderer.t.enter_at_least.replace(':min', min)));
          __out.push(' ');
          __out.push(__sanitize(FormRenderer.t[units]));
          __out.push('.\n      ');
        } else if (max) {
          __out.push('\n        ');
          __out.push(__sanitize(FormRenderer.t.enter_up_to.replace(':max', max)));
          __out.push(' ');
          __out.push(__sanitize(FormRenderer.t[units]));
          __out.push('.\n      ');
        }
        __out.push('\n    </span>\n\n    ');
        __out.push(JST["partials/length_counter"](this));
        __out.push('\n  </div>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/min_max_validations"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var max, min;
    
      if (this.model.hasMinMaxValidation()) {
        __out.push('\n  ');
        min = this.model.get('min');
        __out.push('\n  ');
        max = this.model.get('max');
        __out.push('\n\n  <div class=\'fr_min_max\'>\n    ');
        if (min && max) {
          __out.push('\n      ');
          __out.push(__sanitize(FormRenderer.t.enter_between.replace(':min', min).replace(':max', max)));
          __out.push('.\n    ');
        } else if (min) {
          __out.push('\n      ');
          __out.push(__sanitize(FormRenderer.t.enter_at_least.replace(':min', min)));
          __out.push('.\n    ');
        } else if (max) {
          __out.push('\n      ');
          __out.push(__sanitize(FormRenderer.t.enter_up_to.replace(':max', max)));
          __out.push('.\n    ');
        }
        __out.push('\n  </div>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/non_input_response_field"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push(JST["fields/" + this.model.field_type](this));
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/pagination"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var i, idx, j, len, ref;
    
      if (this.form_renderer.visiblePages().length > 1) {
        __out.push('\n  <ul class=\'fr_pagination\'>\n    ');
        ref = this.form_renderer.visiblePages();
        for (idx = j = 0, len = ref.length; j < len; idx = ++j) {
          i = ref[idx];
          __out.push('\n      <li class=\'');
          if (!this.form_renderer.isPageValid(i)) {
            __out.push('has_errors');
          }
          __out.push('\'>\n        ');
          if (i === this.form_renderer.state.get('activePage')) {
            __out.push('\n          <span>');
            __out.push(__sanitize(idx + 1));
            __out.push('</span>\n        </li>\n        ');
          } else {
            __out.push('\n          <a data-activate-page="');
            __out.push(__sanitize(i));
            __out.push('" href=\'#\'>\n            ');
            __out.push(__sanitize(idx + 1));
            __out.push('\n          </a>\n        ');
          }
          __out.push('\n      </li>\n    ');
        }
        __out.push('\n  </ul>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/repeating_group_entry"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_group_entry_idx\'><span>');
    
      __out.push(__sanitize(this.idx + 1));
    
      __out.push('</span></div>\n\n<div class=\'fr_group_entry_fields\'>\n</div>\n\n');
    
      if (this.entry.canRemove()) {
        __out.push('\n  <a href=\'#\' class=\'js-remove-entry ');
        __out.push(FormRenderer.REMOVE_ENTRY_LINK_CLASS);
        __out.push('\'>');
        __out.push(FormRenderer.REMOVE_ENTRY_LINK_HTML);
        __out.push('</a>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/repeating_group"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<fieldset class=\'fr_fieldset\'>\n  <legend>');
    
      __out.push(__sanitize(this.model.get('label')));
    
      __out.push('</legend>\n\n  ');
    
      __out.push(JST["partials/label"](this));
    
      __out.push('\n\n  <div class="fr_description">\n    ');
    
      if (this.model.renderingRespondentForm()) {
        __out.push('\n      ');
        __out.push(__sanitize(this.model.get('description')));
        __out.push('\n    ');
      } else {
        __out.push('\n      ');
        __out.push(__sanitize(this.model.getTruncatedDescription()));
        __out.push('\n    ');
      }
    
      __out.push('\n  </div>\n\n  ');
    
      if (this.model.isSkipped()) {
        __out.push('\n    <a href=\'#\' class=\'js-skip fr_group_answer\'>');
        __out.push(__sanitize(FormRenderer.t.answer));
        __out.push('</a>\n    <div class=\'fr_group_skipped\' style=\'clear: both\'>');
        __out.push(__sanitize(FormRenderer.t.skipped));
        __out.push('</div>\n  ');
      } else {
        __out.push('\n    ');
        if (!this.model.isRequired()) {
          __out.push('\n      <a href=\'#\' class=\'js-skip fr_group_skip\'>');
          __out.push(__sanitize(FormRenderer.t.skip));
          __out.push('</a>\n    ');
        }
        __out.push('\n\n    <div class=\'fr_group_entries\'>\n    </div>\n\n    ');
        if (this.model.canAdd()) {
          __out.push('\n      <a href=\'#\' class=\'js-add-entry ');
          __out.push(__sanitize(FormRenderer.BUTTON_CLASS));
          __out.push('\'>');
          __out.push(__sanitize(FormRenderer.t.add_another));
          __out.push('</a>\n    ');
        }
        __out.push('\n  ');
      }
    
      __out.push('\n</fieldset>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/required"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      if (this.model.get('required')) {
        __out.push('&nbsp;<abbr class=\'fr_required\' title=\'required\'>*</abbr>');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/response_field"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      if (this.model.wrapper === 'fieldset') {
        __out.push('\n  <fieldset class=\'fr_fieldset\'>\n    <legend>');
        __out.push(__sanitize(this.model.get('label')));
        __out.push('</legend>\n    ');
        __out.push(JST["partials/label"](this));
        __out.push('\n    <div class=\'fr_field_wrapper\'>\n      ');
        __out.push(JST["fields/" + this.model.field_type](this));
        __out.push('\n    </div>\n  </fieldset>\n');
      } else if (this.model.wrapper === 'label') {
        __out.push('\n  ');
        __out.push(JST["partials/label"](this));
        __out.push('\n  <div class=\'fr_field_wrapper\'>\n    ');
        __out.push(JST["fields/" + this.model.field_type](this));
        __out.push('\n  </div>\n');
      } else {
        __out.push('\n  <div class=\'fr_field_wrapper\'>\n    ');
        __out.push(JST["fields/" + this.model.field_type](this));
        __out.push('\n  </div>\n');
      }
    
      __out.push('\n\n');
    
      __out.push(JST["partials/length_validations"](this));
    
      __out.push('\n');
    
      __out.push(JST["partials/min_max_validations"](this));
    
      __out.push('\n');
    
      __out.push(JST["partials/error"](this));
    
      __out.push('\n');
    
      __out.push(JST["partials/description"](this));
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["partials/verify"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_loading\'>\n  <p>');
    
      __out.push(__sanitize(this.safe(this.template)));
    
      __out.push('</p>\n  ');
    
      if (this.href != null) {
        __out.push('\n    <div>\n      <button id=\'screendoor-verify-identity\' href=\'#\' data-href=\'');
        __out.push(__sanitize(this.href));
        __out.push('\'>');
        __out.push(__sanitize(this.button));
        __out.push('</button>\n    </div>\n  ');
      }
    
      __out.push('\n</div>\n\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["plugins/bookmark_draft"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      __out.push('<div class=\'fr_bookmark\'>\n  <a href=\'#\' class=\'js-fr-bookmark\'>');
    
      __out.push(__sanitize(FormRenderer.t.finish_later));
    
      __out.push('</a>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["plugins/bottom_bar"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
    
      __out.push('<div class=\'fr_bottom\'>\n  ');
    
      if (indexOf.call(this.form_renderer.options.plugins, 'Autosave') >= 0) {
        __out.push('\n    <div class=\'fr_bottom_l\'>\n      ');
        if (this.form_renderer.state.get('hasServerErrors')) {
          __out.push('\n        ');
          __out.push(__sanitize(this.form_renderer.state.get('serverErrorText') || FormRenderer.t.error_saving));
          __out.push('\n      ');
        } else if (this.form_renderer.state.get('hasChanges')) {
          __out.push('\n        ');
          __out.push(__sanitize(FormRenderer.t.saving));
          __out.push('\n      ');
        } else {
          __out.push('\n        ');
          __out.push(__sanitize(FormRenderer.t.saved));
          __out.push('\n      ');
        }
        __out.push('\n    </div>\n  ');
      }
    
      __out.push('\n\n  <div class=\'fr_bottom_r\'>\n    ');
    
      if (!this.form_renderer.isFirstPage()) {
        __out.push('\n      <button data-fr-previous-page class=\'');
        __out.push(__sanitize(FormRenderer.BUTTON_CLASS));
        __out.push('\'>\n        ');
        __out.push(__sanitize(FormRenderer.t.back_to_page.replace(':num', this.form_renderer.previousPage())));
        __out.push('\n      </button>\n    ');
      }
    
      __out.push('\n\n    ');
    
      if (this.form_renderer.state.get('submitting')) {
        __out.push('\n      <button disabled class=\'');
        __out.push(__sanitize(FormRenderer.BUTTON_CLASS));
        __out.push('\'>\n        ');
        __out.push(__sanitize(FormRenderer.t.submitting));
        __out.push('\n      </button>\n    ');
      } else {
        __out.push('\n      <button data-fr-next-page class=\'');
        __out.push(__sanitize(FormRenderer.BUTTON_CLASS));
        __out.push('\'>\n        ');
        if (this.form_renderer.isLastPage() || !this.form_renderer.options.enablePages) {
          __out.push(__sanitize(FormRenderer.t.submit));
        } else {
          __out.push(__sanitize(FormRenderer.t.next_page));
        }
        __out.push('\n      </button>\n    ');
      }
    
      __out.push('\n  </div>\n</div>\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}

if (!window.JST) {
  window.JST = {};
}
window.JST["plugins/error_bar"] = function(__obj) {
  if (!__obj) __obj = {};
  var __out = [], __capture = function(callback) {
    var out = __out, result;
    __out = [];
    callback.call(this);
    result = __out.join('');
    __out = out;
    return __safe(result);
  }, __sanitize = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else if (typeof value !== 'undefined' && value != null) {
      return __escape(value);
    } else {
      return '';
    }
  }, __safe, __objSafe = __obj.safe, __escape = __obj.escape;
  __safe = __obj.safe = function(value) {
    if (value && value.ecoSafe) {
      return value;
    } else {
      if (!(typeof value !== 'undefined' && value != null)) value = '';
      var result = new String(value);
      result.ecoSafe = true;
      return result;
    }
  };
  if (!__escape) {
    __escape = __obj.escape = function(value) {
      return ('' + value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
  }
  (function() {
    (function() {
      if (!this.form_renderer.areAllPagesValid()) {
        __out.push('\n  <div class=\'fr_error_alert_bar\' role=\'alert\'>\n    ');
        __out.push(FormRenderer.t.error_bar.errors);
        __out.push('\n  </div>\n');
      }
    
      __out.push('\n');
    
    }).call(this);
    
  }).call(__obj);
  __obj.safe = __objSafe, __obj.escape = __escape;
  return __out.join('');
}
})(window);