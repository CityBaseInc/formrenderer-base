(function(window){/*!
 * jQuery Form Plugin
 * version: 3.46.0-2013.11.21
 * Requires jQuery v1.5 or later
 * Copyright (c) 2013 M. Alsup
 * Examples and documentation at: http://malsup.com/jquery/form/
 * Project repository: https://github.com/malsup/form
 * Dual licensed under the MIT and GPL licenses.
 * https://github.com/malsup/form#copyright-and-license
 */
/*global ActiveXObject */

// AMD support
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // using AMD; register as anon module
        define(['jquery'], factory);
    } else {
        // no AMD; invoke directly
        factory( (typeof(jQuery) != 'undefined') ? jQuery : window.Zepto );
    }
}

(function($) {
"use strict";

/*
    Usage Note:
    -----------
    Do not use both ajaxSubmit and ajaxForm on the same form.  These
    functions are mutually exclusive.  Use ajaxSubmit if you want
    to bind your own submit handler to the form.  For example,

    $(document).ready(function() {
        $('#myForm').on('submit', function(e) {
            e.preventDefault(); // <-- important
            $(this).ajaxSubmit({
                target: '#output'
            });
        });
    });

    Use ajaxForm when you want the plugin to manage all the event binding
    for you.  For example,

    $(document).ready(function() {
        $('#myForm').ajaxForm({
            target: '#output'
        });
    });

    You can also use ajaxForm with delegation (requires jQuery v1.7+), so the
    form does not have to exist when you invoke ajaxForm:

    $('#myForm').ajaxForm({
        delegation: true,
        target: '#output'
    });

    When using ajaxForm, the ajaxSubmit function will be invoked for you
    at the appropriate time.
*/

/**
 * Feature detection
 */
var feature = {};
feature.fileapi = $("<input type='file'/>").get(0).files !== undefined;
feature.formdata = window.FormData !== undefined;

var hasProp = !!$.fn.prop;

// attr2 uses prop when it can but checks the return type for
// an expected string.  this accounts for the case where a form 
// contains inputs with names like "action" or "method"; in those
// cases "prop" returns the element
$.fn.attr2 = function() {
    if ( ! hasProp )
        return this.attr.apply(this, arguments);
    var val = this.prop.apply(this, arguments);
    if ( ( val && val.jquery ) || typeof val === 'string' )
        return val;
    return this.attr.apply(this, arguments);
};

/**
 * ajaxSubmit() provides a mechanism for immediately submitting
 * an HTML form using AJAX.
 */
$.fn.ajaxSubmit = function(options) {
    /*jshint scripturl:true */

    // fast fail if nothing selected (http://dev.jquery.com/ticket/2752)
    if (!this.length) {
        log('ajaxSubmit: skipping submit process - no element selected');
        return this;
    }

    var method, action, url, $form = this;

    if (typeof options == 'function') {
        options = { success: options };
    }
    else if ( options === undefined ) {
        options = {};
    }

    method = options.type || this.attr2('method');
    action = options.url  || this.attr2('action');

    url = (typeof action === 'string') ? $.trim(action) : '';
    url = url || window.location.href || '';
    if (url) {
        // clean url (don't include hash vaue)
        url = (url.match(/^([^#]+)/)||[])[1];
    }

    options = $.extend(true, {
        url:  url,
        success: $.ajaxSettings.success,
        type: method || $.ajaxSettings.type,
        iframeSrc: /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank'
    }, options);

    // hook for manipulating the form data before it is extracted;
    // convenient for use with rich editors like tinyMCE or FCKEditor
    var veto = {};
    this.trigger('form-pre-serialize', [this, options, veto]);
    if (veto.veto) {
        log('ajaxSubmit: submit vetoed via form-pre-serialize trigger');
        return this;
    }

    // provide opportunity to alter form data before it is serialized
    if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
        log('ajaxSubmit: submit aborted via beforeSerialize callback');
        return this;
    }

    var traditional = options.traditional;
    if ( traditional === undefined ) {
        traditional = $.ajaxSettings.traditional;
    }

    var elements = [];
    var qx, a = this.formToArray(options.semantic, elements);
    if (options.data) {
        options.extraData = options.data;
        qx = $.param(options.data, traditional);
    }

    // give pre-submit callback an opportunity to abort the submit
    if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
        log('ajaxSubmit: submit aborted via beforeSubmit callback');
        return this;
    }

    // fire vetoable 'validate' event
    this.trigger('form-submit-validate', [a, this, options, veto]);
    if (veto.veto) {
        log('ajaxSubmit: submit vetoed via form-submit-validate trigger');
        return this;
    }

    var q = $.param(a, traditional);
    if (qx) {
        q = ( q ? (q + '&' + qx) : qx );
    }
    if (options.type.toUpperCase() == 'GET') {
        options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + q;
        options.data = null;  // data is null for 'get'
    }
    else {
        options.data = q; // data is the query string for 'post'
    }

    var callbacks = [];
    if (options.resetForm) {
        callbacks.push(function() { $form.resetForm(); });
    }
    if (options.clearForm) {
        callbacks.push(function() { $form.clearForm(options.includeHidden); });
    }

    // perform a load on the target only if dataType is not provided
    if (!options.dataType && options.target) {
        var oldSuccess = options.success || function(){};
        callbacks.push(function(data) {
            var fn = options.replaceTarget ? 'replaceWith' : 'html';
            $(options.target)[fn](data).each(oldSuccess, arguments);
        });
    }
    else if (options.success) {
        callbacks.push(options.success);
    }

    options.success = function(data, status, xhr) { // jQuery 1.4+ passes xhr as 3rd arg
        var context = options.context || this ;    // jQuery 1.4+ supports scope context
        for (var i=0, max=callbacks.length; i < max; i++) {
            callbacks[i].apply(context, [data, status, xhr || $form, $form]);
        }
    };

    if (options.error) {
        var oldError = options.error;
        options.error = function(xhr, status, error) {
            var context = options.context || this;
            oldError.apply(context, [xhr, status, error, $form]);
        };
    }

     if (options.complete) {
        var oldComplete = options.complete;
        options.complete = function(xhr, status) {
            var context = options.context || this;
            oldComplete.apply(context, [xhr, status, $form]);
        };
    }

    // are there files to upload?

    // [value] (issue #113), also see comment:
    // https://github.com/malsup/form/commit/588306aedba1de01388032d5f42a60159eea9228#commitcomment-2180219
    var fileInputs = $('input[type=file]:enabled', this).filter(function() { return $(this).val() !== ''; });

    var hasFileInputs = fileInputs.length > 0;
    var mp = 'multipart/form-data';
    var multipart = ($form.attr('enctype') == mp || $form.attr('encoding') == mp);

    var fileAPI = feature.fileapi && feature.formdata;
    log("fileAPI :" + fileAPI);
    var shouldUseFrame = (hasFileInputs || multipart) && !fileAPI;

    var jqxhr;

    // options.iframe allows user to force iframe mode
    // 06-NOV-09: now defaulting to iframe mode if file input is detected
    if (options.iframe !== false && (options.iframe || shouldUseFrame)) {
        // hack to fix Safari hang (thanks to Tim Molendijk for this)
        // see:  http://groups.google.com/group/jquery-dev/browse_thread/thread/36395b7ab510dd5d
        if (options.closeKeepAlive) {
            $.get(options.closeKeepAlive, function() {
                jqxhr = fileUploadIframe(a);
            });
        }
        else {
            jqxhr = fileUploadIframe(a);
        }
    }
    else if ((hasFileInputs || multipart) && fileAPI) {
        jqxhr = fileUploadXhr(a);
    }
    else {
        jqxhr = $.ajax(options);
    }

    $form.removeData('jqxhr').data('jqxhr', jqxhr);

    // clear element array
    for (var k=0; k < elements.length; k++)
        elements[k] = null;

    // fire 'notify' event
    this.trigger('form-submit-notify', [this, options]);
    return this;

    // utility fn for deep serialization
    function deepSerialize(extraData){
        var serialized = $.param(extraData, options.traditional).split('&');
        var len = serialized.length;
        var result = [];
        var i, part;
        for (i=0; i < len; i++) {
            // #252; undo param space replacement
            serialized[i] = serialized[i].replace(/\+/g,' ');
            part = serialized[i].split('=');
            // #278; use array instead of object storage, favoring array serializations
            result.push([decodeURIComponent(part[0]), decodeURIComponent(part[1])]);
        }
        return result;
    }

     // XMLHttpRequest Level 2 file uploads (big hat tip to francois2metz)
    function fileUploadXhr(a) {
        var formdata = new FormData();

        for (var i=0; i < a.length; i++) {
            formdata.append(a[i].name, a[i].value);
        }

        if (options.extraData) {
            var serializedData = deepSerialize(options.extraData);
            for (i=0; i < serializedData.length; i++)
                if (serializedData[i])
                    formdata.append(serializedData[i][0], serializedData[i][1]);
        }

        options.data = null;

        var s = $.extend(true, {}, $.ajaxSettings, options, {
            contentType: false,
            processData: false,
            cache: false,
            type: method || 'POST'
        });

        if (options.uploadProgress) {
            // workaround because jqXHR does not expose upload property
            s.xhr = function() {
                var xhr = $.ajaxSettings.xhr();
                if (xhr.upload) {
                    xhr.upload.addEventListener('progress', function(event) {
                        var percent = 0;
                        var position = event.loaded || event.position; /*event.position is deprecated*/
                        var total = event.total;
                        if (event.lengthComputable) {
                            percent = Math.ceil(position / total * 100);
                        }
                        options.uploadProgress(event, position, total, percent);
                    }, false);
                }
                return xhr;
            };
        }

        s.data = null;
        var beforeSend = s.beforeSend;
        s.beforeSend = function(xhr, o) {
            //Send FormData() provided by user
            if (options.formData)
                o.data = options.formData;
            else
                o.data = formdata;
            if(beforeSend)
                beforeSend.call(this, xhr, o);
        };
        return $.ajax(s);
    }

    // private function for handling file uploads (hat tip to YAHOO!)
    function fileUploadIframe(a) {
        var form = $form[0], el, i, s, g, id, $io, io, xhr, sub, n, timedOut, timeoutHandle;
        var deferred = $.Deferred();

        // #341
        deferred.abort = function(status) {
            xhr.abort(status);
        };

        if (a) {
            // ensure that every serialized input is still enabled
            for (i=0; i < elements.length; i++) {
                el = $(elements[i]);
                if ( hasProp )
                    el.prop('disabled', false);
                else
                    el.removeAttr('disabled');
            }
        }

        s = $.extend(true, {}, $.ajaxSettings, options);
        s.context = s.context || s;
        id = 'jqFormIO' + (new Date().getTime());
        if (s.iframeTarget) {
            $io = $(s.iframeTarget);
            n = $io.attr2('name');
            if (!n)
                 $io.attr2('name', id);
            else
                id = n;
        }
        else {
            $io = $('<iframe name="' + id + '" src="'+ s.iframeSrc +'" />');
            $io.css({ position: 'absolute', top: '-1000px', left: '-1000px' });
        }
        io = $io[0];


        xhr = { // mock object
            aborted: 0,
            responseText: null,
            responseXML: null,
            status: 0,
            statusText: 'n/a',
            getAllResponseHeaders: function() {},
            getResponseHeader: function() {},
            setRequestHeader: function() {},
            abort: function(status) {
                var e = (status === 'timeout' ? 'timeout' : 'aborted');
                log('aborting upload... ' + e);
                this.aborted = 1;

                try { // #214, #257
                    if (io.contentWindow.document.execCommand) {
                        io.contentWindow.document.execCommand('Stop');
                    }
                }
                catch(ignore) {}

                $io.attr('src', s.iframeSrc); // abort op in progress
                xhr.error = e;
                if (s.error)
                    s.error.call(s.context, xhr, e, status);
                if (g)
                    $.event.trigger("ajaxError", [xhr, s, e]);
                if (s.complete)
                    s.complete.call(s.context, xhr, e);
            }
        };

        g = s.global;
        // trigger ajax global events so that activity/block indicators work like normal
        if (g && 0 === $.active++) {
            $.event.trigger("ajaxStart");
        }
        if (g) {
            $.event.trigger("ajaxSend", [xhr, s]);
        }

        if (s.beforeSend && s.beforeSend.call(s.context, xhr, s) === false) {
            if (s.global) {
                $.active--;
            }
            deferred.reject();
            return deferred;
        }
        if (xhr.aborted) {
            deferred.reject();
            return deferred;
        }

        // add submitting element to data if we know it
        sub = form.clk;
        if (sub) {
            n = sub.name;
            if (n && !sub.disabled) {
                s.extraData = s.extraData || {};
                s.extraData[n] = sub.value;
                if (sub.type == "image") {
                    s.extraData[n+'.x'] = form.clk_x;
                    s.extraData[n+'.y'] = form.clk_y;
                }
            }
        }

        var CLIENT_TIMEOUT_ABORT = 1;
        var SERVER_ABORT = 2;
                
        function getDoc(frame) {
            /* it looks like contentWindow or contentDocument do not
             * carry the protocol property in ie8, when running under ssl
             * frame.document is the only valid response document, since
             * the protocol is know but not on the other two objects. strange?
             * "Same origin policy" http://en.wikipedia.org/wiki/Same_origin_policy
             */
            
            var doc = null;
            
            // IE8 cascading access check
            try {
                if (frame.contentWindow) {
                    doc = frame.contentWindow.document;
                }
            } catch(err) {
                // IE8 access denied under ssl & missing protocol
                log('cannot get iframe.contentWindow document: ' + err);
            }

            if (doc) { // successful getting content
                return doc;
            }

            try { // simply checking may throw in ie8 under ssl or mismatched protocol
                doc = frame.contentDocument ? frame.contentDocument : frame.document;
            } catch(err) {
                // last attempt
                log('cannot get iframe.contentDocument: ' + err);
                doc = frame.document;
            }
            return doc;
        }

        // Rails CSRF hack (thanks to Yvan Barthelemy)
        var csrf_token = $('meta[name=csrf-token]').attr('content');
        var csrf_param = $('meta[name=csrf-param]').attr('content');
        if (csrf_param && csrf_token) {
            s.extraData = s.extraData || {};
            s.extraData[csrf_param] = csrf_token;
        }

        // take a breath so that pending repaints get some cpu time before the upload starts
        function doSubmit() {
            // make sure form attrs are set
            var t = $form.attr2('target'), a = $form.attr2('action');

            // update form attrs in IE friendly way
            form.setAttribute('target',id);
            if (!method || /post/i.test(method) ) {
                form.setAttribute('method', 'POST');
            }
            if (a != s.url) {
                form.setAttribute('action', s.url);
            }

            // ie borks in some cases when setting encoding
            if (! s.skipEncodingOverride && (!method || /post/i.test(method))) {
                $form.attr({
                    encoding: 'multipart/form-data',
                    enctype:  'multipart/form-data'
                });
            }

            // support timout
            if (s.timeout) {
                timeoutHandle = setTimeout(function() { timedOut = true; cb(CLIENT_TIMEOUT_ABORT); }, s.timeout);
            }

            // look for server aborts
            function checkState() {
                try {
                    var state = getDoc(io).readyState;
                    log('state = ' + state);
                    if (state && state.toLowerCase() == 'uninitialized')
                        setTimeout(checkState,50);
                }
                catch(e) {
                    log('Server abort: ' , e, ' (', e.name, ')');
                    cb(SERVER_ABORT);
                    if (timeoutHandle)
                        clearTimeout(timeoutHandle);
                    timeoutHandle = undefined;
                }
            }

            // add "extra" data to form if provided in options
            var extraInputs = [];
            try {
                if (s.extraData) {
                    for (var n in s.extraData) {
                        if (s.extraData.hasOwnProperty(n)) {
                           // if using the $.param format that allows for multiple values with the same name
                           if($.isPlainObject(s.extraData[n]) && s.extraData[n].hasOwnProperty('name') && s.extraData[n].hasOwnProperty('value')) {
                               extraInputs.push(
                               $('<input type="hidden" name="'+s.extraData[n].name+'">').val(s.extraData[n].value)
                                   .appendTo(form)[0]);
                           } else {
                               extraInputs.push(
                               $('<input type="hidden" name="'+n+'">').val(s.extraData[n])
                                   .appendTo(form)[0]);
                           }
                        }
                    }
                }

                if (!s.iframeTarget) {
                    // add iframe to doc and submit the form
                    $io.appendTo('body');
                }
                if (io.attachEvent)
                    io.attachEvent('onload', cb);
                else
                    io.addEventListener('load', cb, false);
                setTimeout(checkState,15);

                try {
                    form.submit();
                } catch(err) {
                    // just in case form has element with name/id of 'submit'
                    var submitFn = document.createElement('form').submit;
                    submitFn.apply(form);
                }
            }
            finally {
                // reset attrs and remove "extra" input elements
                form.setAttribute('action',a);
                if(t) {
                    form.setAttribute('target', t);
                } else {
                    $form.removeAttr('target');
                }
                $(extraInputs).remove();
            }
        }

        if (s.forceSync) {
            doSubmit();
        }
        else {
            setTimeout(doSubmit, 10); // this lets dom updates render
        }

        var data, doc, domCheckCount = 50, callbackProcessed;

        function cb(e) {
            if (xhr.aborted || callbackProcessed) {
                return;
            }
            
            doc = getDoc(io);
            if(!doc) {
                log('cannot access response document');
                e = SERVER_ABORT;
            }
            if (e === CLIENT_TIMEOUT_ABORT && xhr) {
                xhr.abort('timeout');
                deferred.reject(xhr, 'timeout');
                return;
            }
            else if (e == SERVER_ABORT && xhr) {
                xhr.abort('server abort');
                deferred.reject(xhr, 'error', 'server abort');
                return;
            }

            if (!doc || doc.location.href == s.iframeSrc) {
                // response not received yet
                if (!timedOut)
                    return;
            }
            if (io.detachEvent)
                io.detachEvent('onload', cb);
            else
                io.removeEventListener('load', cb, false);

            var status = 'success', errMsg;
            try {
                if (timedOut) {
                    throw 'timeout';
                }

                var isXml = s.dataType == 'xml' || doc.XMLDocument || $.isXMLDoc(doc);
                log('isXml='+isXml);
                if (!isXml && window.opera && (doc.body === null || !doc.body.innerHTML)) {
                    if (--domCheckCount) {
                        // in some browsers (Opera) the iframe DOM is not always traversable when
                        // the onload callback fires, so we loop a bit to accommodate
                        log('requeing onLoad callback, DOM not available');
                        setTimeout(cb, 250);
                        return;
                    }
                    // let this fall through because server response could be an empty document
                    //log('Could not access iframe DOM after mutiple tries.');
                    //throw 'DOMException: not available';
                }

                //log('response detected');
                var docRoot = doc.body ? doc.body : doc.documentElement;
                xhr.responseText = docRoot ? docRoot.innerHTML : null;
                xhr.responseXML = doc.XMLDocument ? doc.XMLDocument : doc;
                if (isXml)
                    s.dataType = 'xml';
                xhr.getResponseHeader = function(header){
                    var headers = {'content-type': s.dataType};
                    return headers[header.toLowerCase()];
                };
                // support for XHR 'status' & 'statusText' emulation :
                if (docRoot) {
                    xhr.status = Number( docRoot.getAttribute('status') ) || xhr.status;
                    xhr.statusText = docRoot.getAttribute('statusText') || xhr.statusText;
                }

                var dt = (s.dataType || '').toLowerCase();
                var scr = /(json|script|text)/.test(dt);
                if (scr || s.textarea) {
                    // see if user embedded response in textarea
                    var ta = doc.getElementsByTagName('textarea')[0];
                    if (ta) {
                        xhr.responseText = ta.value;
                        // support for XHR 'status' & 'statusText' emulation :
                        xhr.status = Number( ta.getAttribute('status') ) || xhr.status;
                        xhr.statusText = ta.getAttribute('statusText') || xhr.statusText;
                    }
                    else if (scr) {
                        // account for browsers injecting pre around json response
                        var pre = doc.getElementsByTagName('pre')[0];
                        var b = doc.getElementsByTagName('body')[0];
                        if (pre) {
                            xhr.responseText = pre.textContent ? pre.textContent : pre.innerText;
                        }
                        else if (b) {
                            xhr.responseText = b.textContent ? b.textContent : b.innerText;
                        }
                    }
                }
                else if (dt == 'xml' && !xhr.responseXML && xhr.responseText) {
                    xhr.responseXML = toXml(xhr.responseText);
                }

                try {
                    data = httpData(xhr, dt, s);
                }
                catch (err) {
                    status = 'parsererror';
                    xhr.error = errMsg = (err || status);
                }
            }
            catch (err) {
                log('error caught: ',err);
                status = 'error';
                xhr.error = errMsg = (err || status);
            }

            if (xhr.aborted) {
                log('upload aborted');
                status = null;
            }

            if (xhr.status) { // we've set xhr.status
                status = (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) ? 'success' : 'error';
            }

            // ordering of these callbacks/triggers is odd, but that's how $.ajax does it
            if (status === 'success') {
                if (s.success)
                    s.success.call(s.context, data, 'success', xhr);
                deferred.resolve(xhr.responseText, 'success', xhr);
                if (g)
                    $.event.trigger("ajaxSuccess", [xhr, s]);
            }
            else if (status) {
                if (errMsg === undefined)
                    errMsg = xhr.statusText;
                if (s.error)
                    s.error.call(s.context, xhr, status, errMsg);
                deferred.reject(xhr, 'error', errMsg);
                if (g)
                    $.event.trigger("ajaxError", [xhr, s, errMsg]);
            }

            if (g)
                $.event.trigger("ajaxComplete", [xhr, s]);

            if (g && ! --$.active) {
                $.event.trigger("ajaxStop");
            }

            if (s.complete)
                s.complete.call(s.context, xhr, status);

            callbackProcessed = true;
            if (s.timeout)
                clearTimeout(timeoutHandle);

            // clean up
            setTimeout(function() {
                if (!s.iframeTarget)
                    $io.remove();
                else  //adding else to clean up existing iframe response.
                    $io.attr('src', s.iframeSrc);
                xhr.responseXML = null;
            }, 100);
        }

        var toXml = $.parseXML || function(s, doc) { // use parseXML if available (jQuery 1.5+)
            if (window.ActiveXObject) {
                doc = new ActiveXObject('Microsoft.XMLDOM');
                doc.async = 'false';
                doc.loadXML(s);
            }
            else {
                doc = (new DOMParser()).parseFromString(s, 'text/xml');
            }
            return (doc && doc.documentElement && doc.documentElement.nodeName != 'parsererror') ? doc : null;
        };
        var parseJSON = $.parseJSON || function(s) {
            /*jslint evil:true */
            return window['eval']('(' + s + ')');
        };

        var httpData = function( xhr, type, s ) { // mostly lifted from jq1.4.4

            var ct = xhr.getResponseHeader('content-type') || '',
                xml = type === 'xml' || !type && ct.indexOf('xml') >= 0,
                data = xml ? xhr.responseXML : xhr.responseText;

            if (xml && data.documentElement.nodeName === 'parsererror') {
                if ($.error)
                    $.error('parsererror');
            }
            if (s && s.dataFilter) {
                data = s.dataFilter(data, type);
            }
            if (typeof data === 'string') {
                if (type === 'json' || !type && ct.indexOf('json') >= 0) {
                    data = parseJSON(data);
                } else if (type === "script" || !type && ct.indexOf("javascript") >= 0) {
                    $.globalEval(data);
                }
            }
            return data;
        };

        return deferred;
    }
};

/**
 * ajaxForm() provides a mechanism for fully automating form submission.
 *
 * The advantages of using this method instead of ajaxSubmit() are:
 *
 * 1: This method will include coordinates for <input type="image" /> elements (if the element
 *    is used to submit the form).
 * 2. This method will include the submit element's name/value data (for the element that was
 *    used to submit the form).
 * 3. This method binds the submit() method to the form for you.
 *
 * The options argument for ajaxForm works exactly as it does for ajaxSubmit.  ajaxForm merely
 * passes the options argument along after properly binding events for submit elements and
 * the form itself.
 */
$.fn.ajaxForm = function(options) {
    options = options || {};
    options.delegation = options.delegation && $.isFunction($.fn.on);

    // in jQuery 1.3+ we can fix mistakes with the ready state
    if (!options.delegation && this.length === 0) {
        var o = { s: this.selector, c: this.context };
        if (!$.isReady && o.s) {
            log('DOM not ready, queuing ajaxForm');
            $(function() {
                $(o.s,o.c).ajaxForm(options);
            });
            return this;
        }
        // is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
        log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));
        return this;
    }

    if ( options.delegation ) {
        $(document)
            .off('submit.form-plugin', this.selector, doAjaxSubmit)
            .off('click.form-plugin', this.selector, captureSubmittingElement)
            .on('submit.form-plugin', this.selector, options, doAjaxSubmit)
            .on('click.form-plugin', this.selector, options, captureSubmittingElement);
        return this;
    }

    return this.ajaxFormUnbind()
        .bind('submit.form-plugin', options, doAjaxSubmit)
        .bind('click.form-plugin', options, captureSubmittingElement);
};

// private event handlers
function doAjaxSubmit(e) {
    /*jshint validthis:true */
    var options = e.data;
    if (!e.isDefaultPrevented()) { // if event has been canceled, don't proceed
        e.preventDefault();
        $(e.target).ajaxSubmit(options); // #365
    }
}

function captureSubmittingElement(e) {
    /*jshint validthis:true */
    var target = e.target;
    var $el = $(target);
    if (!($el.is("[type=submit],[type=image]"))) {
        // is this a child element of the submit el?  (ex: a span within a button)
        var t = $el.closest('[type=submit]');
        if (t.length === 0) {
            return;
        }
        target = t[0];
    }
    var form = this;
    form.clk = target;
    if (target.type == 'image') {
        if (e.offsetX !== undefined) {
            form.clk_x = e.offsetX;
            form.clk_y = e.offsetY;
        } else if (typeof $.fn.offset == 'function') {
            var offset = $el.offset();
            form.clk_x = e.pageX - offset.left;
            form.clk_y = e.pageY - offset.top;
        } else {
            form.clk_x = e.pageX - target.offsetLeft;
            form.clk_y = e.pageY - target.offsetTop;
        }
    }
    // clear form vars
    setTimeout(function() { form.clk = form.clk_x = form.clk_y = null; }, 100);
}


// ajaxFormUnbind unbinds the event handlers that were bound by ajaxForm
$.fn.ajaxFormUnbind = function() {
    return this.unbind('submit.form-plugin click.form-plugin');
};

/**
 * formToArray() gathers form element data into an array of objects that can
 * be passed to any of the following ajax functions: $.get, $.post, or load.
 * Each object in the array has both a 'name' and 'value' property.  An example of
 * an array for a simple login form might be:
 *
 * [ { name: 'username', value: 'jresig' }, { name: 'password', value: 'secret' } ]
 *
 * It is this array that is passed to pre-submit callback functions provided to the
 * ajaxSubmit() and ajaxForm() methods.
 */
$.fn.formToArray = function(semantic, elements) {
    var a = [];
    if (this.length === 0) {
        return a;
    }

    var form = this[0];
    var els = semantic ? form.getElementsByTagName('*') : form.elements;
    if (!els) {
        return a;
    }

    var i,j,n,v,el,max,jmax;
    for(i=0, max=els.length; i < max; i++) {
        el = els[i];
        n = el.name;
        if (!n || el.disabled) {
            continue;
        }

        if (semantic && form.clk && el.type == "image") {
            // handle image inputs on the fly when semantic == true
            if(form.clk == el) {
                a.push({name: n, value: $(el).val(), type: el.type });
                a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
            }
            continue;
        }

        v = $.fieldValue(el, true);
        if (v && v.constructor == Array) {
            if (elements)
                elements.push(el);
            for(j=0, jmax=v.length; j < jmax; j++) {
                a.push({name: n, value: v[j]});
            }
        }
        else if (feature.fileapi && el.type == 'file') {
            if (elements)
                elements.push(el);
            var files = el.files;
            if (files.length) {
                for (j=0; j < files.length; j++) {
                    a.push({name: n, value: files[j], type: el.type});
                }
            }
            else {
                // #180
                a.push({ name: n, value: '', type: el.type });
            }
        }
        else if (v !== null && typeof v != 'undefined') {
            if (elements)
                elements.push(el);
            a.push({name: n, value: v, type: el.type, required: el.required});
        }
    }

    if (!semantic && form.clk) {
        // input type=='image' are not found in elements array! handle it here
        var $input = $(form.clk), input = $input[0];
        n = input.name;
        if (n && !input.disabled && input.type == 'image') {
            a.push({name: n, value: $input.val()});
            a.push({name: n+'.x', value: form.clk_x}, {name: n+'.y', value: form.clk_y});
        }
    }
    return a;
};

/**
 * Serializes form data into a 'submittable' string. This method will return a string
 * in the format: name1=value1&amp;name2=value2
 */
$.fn.formSerialize = function(semantic) {
    //hand off to jQuery.param for proper encoding
    return $.param(this.formToArray(semantic));
};

/**
 * Serializes all field elements in the jQuery object into a query string.
 * This method will return a string in the format: name1=value1&amp;name2=value2
 */
$.fn.fieldSerialize = function(successful) {
    var a = [];
    this.each(function() {
        var n = this.name;
        if (!n) {
            return;
        }
        var v = $.fieldValue(this, successful);
        if (v && v.constructor == Array) {
            for (var i=0,max=v.length; i < max; i++) {
                a.push({name: n, value: v[i]});
            }
        }
        else if (v !== null && typeof v != 'undefined') {
            a.push({name: this.name, value: v});
        }
    });
    //hand off to jQuery.param for proper encoding
    return $.param(a);
};

/**
 * Returns the value(s) of the element in the matched set.  For example, consider the following form:
 *
 *  <form><fieldset>
 *      <input name="A" type="text" />
 *      <input name="A" type="text" />
 *      <input name="B" type="checkbox" value="B1" />
 *      <input name="B" type="checkbox" value="B2"/>
 *      <input name="C" type="radio" value="C1" />
 *      <input name="C" type="radio" value="C2" />
 *  </fieldset></form>
 *
 *  var v = $('input[type=text]').fieldValue();
 *  // if no values are entered into the text inputs
 *  v == ['','']
 *  // if values entered into the text inputs are 'foo' and 'bar'
 *  v == ['foo','bar']
 *
 *  var v = $('input[type=checkbox]').fieldValue();
 *  // if neither checkbox is checked
 *  v === undefined
 *  // if both checkboxes are checked
 *  v == ['B1', 'B2']
 *
 *  var v = $('input[type=radio]').fieldValue();
 *  // if neither radio is checked
 *  v === undefined
 *  // if first radio is checked
 *  v == ['C1']
 *
 * The successful argument controls whether or not the field element must be 'successful'
 * (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
 * The default value of the successful argument is true.  If this value is false the value(s)
 * for each element is returned.
 *
 * Note: This method *always* returns an array.  If no valid value can be determined the
 *    array will be empty, otherwise it will contain one or more values.
 */
$.fn.fieldValue = function(successful) {
    for (var val=[], i=0, max=this.length; i < max; i++) {
        var el = this[i];
        var v = $.fieldValue(el, successful);
        if (v === null || typeof v == 'undefined' || (v.constructor == Array && !v.length)) {
            continue;
        }
        if (v.constructor == Array)
            $.merge(val, v);
        else
            val.push(v);
    }
    return val;
};

/**
 * Returns the value of the field element.
 */
$.fieldValue = function(el, successful) {
    var n = el.name, t = el.type, tag = el.tagName.toLowerCase();
    if (successful === undefined) {
        successful = true;
    }

    if (successful && (!n || el.disabled || t == 'reset' || t == 'button' ||
        (t == 'checkbox' || t == 'radio') && !el.checked ||
        (t == 'submit' || t == 'image') && el.form && el.form.clk != el ||
        tag == 'select' && el.selectedIndex == -1)) {
            return null;
    }

    if (tag == 'select') {
        var index = el.selectedIndex;
        if (index < 0) {
            return null;
        }
        var a = [], ops = el.options;
        var one = (t == 'select-one');
        var max = (one ? index+1 : ops.length);
        for(var i=(one ? index : 0); i < max; i++) {
            var op = ops[i];
            if (op.selected) {
                var v = op.value;
                if (!v) { // extra pain for IE...
                    v = (op.attributes && op.attributes['value'] && !(op.attributes['value'].specified)) ? op.text : op.value;
                }
                if (one) {
                    return v;
                }
                a.push(v);
            }
        }
        return a;
    }
    return $(el).val();
};

/**
 * Clears the form data.  Takes the following actions on the form's input fields:
 *  - input text fields will have their 'value' property set to the empty string
 *  - select elements will have their 'selectedIndex' property set to -1
 *  - checkbox and radio inputs will have their 'checked' property set to false
 *  - inputs of type submit, button, reset, and hidden will *not* be effected
 *  - button elements will *not* be effected
 */
$.fn.clearForm = function(includeHidden) {
    return this.each(function() {
        $('input,select,textarea', this).clearFields(includeHidden);
    });
};

/**
 * Clears the selected form elements.
 */
$.fn.clearFields = $.fn.clearInputs = function(includeHidden) {
    var re = /^(?:color|date|datetime|email|month|number|password|range|search|tel|text|time|url|week)$/i; // 'hidden' is not in this list
    return this.each(function() {
        var t = this.type, tag = this.tagName.toLowerCase();
        if (re.test(t) || tag == 'textarea') {
            this.value = '';
        }
        else if (t == 'checkbox' || t == 'radio') {
            this.checked = false;
        }
        else if (tag == 'select') {
            this.selectedIndex = -1;
        }
		else if (t == "file") {
			if (/MSIE/.test(navigator.userAgent)) {
				$(this).replaceWith($(this).clone(true));
			} else {
				$(this).val('');
			}
		}
        else if (includeHidden) {
            // includeHidden can be the value true, or it can be a selector string
            // indicating a special test; for example:
            //  $('#myForm').clearForm('.special:hidden')
            // the above would clean hidden inputs that have the class of 'special'
            if ( (includeHidden === true && /hidden/.test(t)) ||
                 (typeof includeHidden == 'string' && $(this).is(includeHidden)) )
                this.value = '';
        }
    });
};

/**
 * Resets the form data.  Causes all form elements to be reset to their original value.
 */
$.fn.resetForm = function() {
    return this.each(function() {
        // guard against an input with the name of 'reset'
        // note that IE reports the reset function as an 'object'
        if (typeof this.reset == 'function' || (typeof this.reset == 'object' && !this.reset.nodeType)) {
            this.reset();
        }
    });
};

/**
 * Enables or disables any matching elements.
 */
$.fn.enable = function(b) {
    if (b === undefined) {
        b = true;
    }
    return this.each(function() {
        this.disabled = !b;
    });
};

/**
 * Checks/unchecks any matching checkboxes or radio buttons and
 * selects/deselects and matching option elements.
 */
$.fn.selected = function(select) {
    if (select === undefined) {
        select = true;
    }
    return this.each(function() {
        var t = this.type;
        if (t == 'checkbox' || t == 'radio') {
            this.checked = select;
        }
        else if (this.tagName.toLowerCase() == 'option') {
            var $sel = $(this).parent('select');
            if (select && $sel[0] && $sel[0].type == 'select-one') {
                // deselect all other options
                $sel.find('option').selected(false);
            }
            this.selected = select;
        }
    });
};

// expose debug var
$.fn.ajaxSubmit.debug = false;

// helper fn for console logging
function log() {
    if (!$.fn.ajaxSubmit.debug)
        return;
    var msg = '[jquery.form] ' + Array.prototype.join.call(arguments,'');
    if (window.console && window.console.log) {
        window.console.log(msg);
    }
    else if (window.opera && window.opera.postError) {
        window.opera.postError(msg);
    }
}

}));


var slice = [].slice;

(function($, window) {
  var InlineFileUpload;
  InlineFileUpload = (function() {
    InlineFileUpload.prototype.defaults = {
      name: 'file',
      action: void 0,
      method: void 0,
      additionalParams: {},
      ajaxOpts: {}
    };

    function InlineFileUpload($input, options) {
      var $form, base, base1;
      this.$input = $input;
      this.options = $.extend({}, this.defaults, options, this.$input.data('ifu-options'));
      $form = this.$input.closest('form');
      (base = this.options).action || (base.action = $form.attr('action'));
      (base1 = this.options).method || (base1.method = $form.find('[name=_method]').val() || $form.attr('method'));
      this._bindInputChange();
    }

    InlineFileUpload.prototype._baseParams = function() {
      return $.extend({
        inline_file_upload: true
      }, this.options.additionalParams);
    };

    InlineFileUpload.prototype._ajaxUpload = function() {
      var $tmpForm;
      $tmpForm = this._createTemporaryForm();
      return $tmpForm.ajaxSubmit($.extend({
        dataType: 'json',
        data: this._baseParams(),
        uploadProgress: (function(_this) {
          return function(_, __, ___, percentComplete) {
            var base, cbData;
            cbData = {
              percent: percentComplete
            };
            if (typeof (base = _this.options).progress === "function") {
              base.progress(cbData);
            }
            return _this.$input.trigger('inline_file_upload:progress', cbData);
          };
        })(this),
        success: (function(_this) {
          return function(data) {
            var base, cbData;
            cbData = {
              data: data
            };
            if (typeof (base = _this.options).success === "function") {
              base.success(cbData);
            }
            return _this.$input.trigger('inline_file_upload:success', cbData);
          };
        })(this),
        error: (function(_this) {
          return function(xhr) {
            var base, cbData;
            cbData = {
              xhr: xhr
            };
            if (typeof (base = _this.options).error === "function") {
              base.error(cbData);
            }
            return _this.$input.trigger('inline_file_upload:error', cbData);
          };
        })(this),
        complete: (function(_this) {
          return function(xhr) {
            var base, cbData;
            $tmpForm.remove();
            cbData = {
              xhr: xhr
            };
            if (typeof (base = _this.options).complete === "function") {
              base.complete(cbData);
            }
            return _this.$input.trigger('inline_file_upload:complete', cbData);
          };
        })(this)
      }, this.options.ajaxOpts));
    };

    InlineFileUpload.prototype._createTemporaryForm = function() {
      var $oldInput, form;
      form = $("<form action='" + this.options.action + "' method='post' style='position:fixed;left:-9999px;'>\n  <input type='hidden' name='_method' value='" + this.options.method + "' />\n</form>");
      $oldInput = this.$input;
      this.$input = $oldInput.clone().val('').insertBefore($oldInput);
      this._bindInputChange();
      $oldInput.appendTo(form);
      $oldInput.attr('name', this.options.name);
      form.insertBefore(this.$input);
      return form;
    };

    InlineFileUpload.prototype._eventToFilename = function(e) {
      if (e.target.files != null) {
        return e.target.files[0].name;
      } else if (e.target.value) {
        return e.target.value.replace(/^.+\\/, '');
      }
    };

    InlineFileUpload.prototype._onChange = function(e) {
      var base, cbData;
      if (!this.$input.val()) {
        return;
      }
      cbData = {
        filename: this._eventToFilename(e)
      };
      if (typeof (base = this.options).start === "function") {
        base.start(cbData);
      }
      this.$input.trigger('inline_file_upload:start', cbData);
      return this._ajaxUpload();
    };

    InlineFileUpload.prototype._bindInputChange = function() {
      return this.$input.on('change', $.proxy(this._onChange, this));
    };

    return InlineFileUpload;

  })();
  return $.fn.extend({
    inlineFileUpload: function() {
      var args, option;
      option = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      return this.each(function() {
        var data;
        data = $(this).data('inline-file-upload');
        if (!data) {
          $(this).data('inline-file-upload', (data = new InlineFileUpload($(this), option)));
        }
        if (typeof option === 'string') {
          return data[option].apply(data, args);
        }
      });
    }
  });
})(window.jQuery, window);

/*!
 * JavaScript Cookie v2.1.3
 * https://github.com/js-cookie/js-cookie
 *
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 * Released under the MIT license
 */
;(function (factory) {
	var registeredInModuleLoader = false;
	if (typeof define === 'function' && define.amd) {
		define(factory);
		registeredInModuleLoader = true;
	}
	if (typeof exports === 'object') {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function init (converter) {
		function api (key, value, attributes) {
			var result;
			if (typeof document === 'undefined') {
				return;
			}

			// Write

			if (arguments.length > 1) {
				attributes = extend({
					path: '/'
				}, api.defaults, attributes);

				if (typeof attributes.expires === 'number') {
					var expires = new Date();
					expires.setMilliseconds(expires.getMilliseconds() + attributes.expires * 864e+5);
					attributes.expires = expires;
				}

				try {
					result = JSON.stringify(value);
					if (/^[\{\[]/.test(result)) {
						value = result;
					}
				} catch (e) {}

				if (!converter.write) {
					value = encodeURIComponent(String(value))
						.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
				} else {
					value = converter.write(value, key);
				}

				key = encodeURIComponent(String(key));
				key = key.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent);
				key = key.replace(/[\(\)]/g, escape);

				return (document.cookie = [
					key, '=', value,
					attributes.expires ? '; expires=' + attributes.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
					attributes.path ? '; path=' + attributes.path : '',
					attributes.domain ? '; domain=' + attributes.domain : '',
					attributes.secure ? '; secure' : ''
				].join(''));
			}

			// Read

			if (!key) {
				result = {};
			}

			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all. Also prevents odd result when
			// calling "get()"
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var rdecode = /(%[0-9A-Z]{2})+/g;
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = parts[0].replace(rdecode, decodeURIComponent);
					cookie = converter.read ?
						converter.read(cookie, name) : converter(cookie, name) ||
						cookie.replace(rdecode, decodeURIComponent);

					if (this.json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					if (key === name) {
						result = cookie;
						break;
					}

					if (!key) {
						result[name] = cookie;
					}
				} catch (e) {}
			}

			return result;
		}

		api.set = api;
		api.get = function (key) {
			return api.call(api, key);
		};
		api.getJSON = function () {
			return api.apply({
				json: true
			}, [].slice.call(arguments));
		};
		api.defaults = {};

		api.remove = function (key, attributes) {
			api(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
}));

//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

//     Backbone.js 1.1.2

//     (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    factory(root, exports, _);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(root, Backbone, _, $) {

  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.1.2';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      for (var id in listeningTo) {
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = options;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      if (attrs && !options.wait) {
        if (!this.set(attrs, options)) return false;
      } else {
        if (!this._validate(attrs, options)) return false;
      }

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model, options);
      }
      return singular ? models[0] : models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults({}, options, setOptions);
      if (options.parse) models = this.parse(models, options);
      var singular = !_.isArray(models);
      models = singular ? (models ? [models] : []) : _.clone(models);
      var i, l, id, model, attrs, existing, sort;
      var at = options.at;
      var targetModel = this.model;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};
      var add = options.add, merge = options.merge, remove = options.remove;
      var order = !sortable && add && remove ? [] : false;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        attrs = models[i] || {};
        if (attrs instanceof Model) {
          id = model = attrs;
        } else {
          id = attrs[targetModel.prototype.idAttribute || 'id'];
        }

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(id)) {
          if (remove) modelMap[existing.cid] = true;
          if (merge) {
            attrs = attrs === model ? model.attributes : attrs;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(attrs, options);
          if (!model) continue;
          toAdd.push(model);
          this._addReference(model, options);
        }

        // Do not add multiple models with the same `id`.
        model = existing || model;
        if (order && (model.isNew() || !modelMap[model.id])) order.push(model);
        modelMap[model.id] = true;
      }

      // Remove nonexistent models if appropriate.
      if (remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length || (order && order.length)) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          for (i = 0, l = toAdd.length; i < l; i++) {
            this.models.splice(at + i, 0, toAdd[i]);
          }
        } else {
          if (order) this.models.length = 0;
          var orderedModels = order || toAdd;
          for (i = 0, l = orderedModels.length; i < l; i++) {
            this.models.push(orderedModels[i]);
          }
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0, l = toAdd.length; i < l; i++) {
          (model = toAdd[i]).trigger('add', model, this, options);
        }
        if (sort || (order && order.length)) this.trigger('sort', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj] || this._byId[obj.id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) return attrs;
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      if (model.id != null) this._byId[model.id] = model;
      if (!model.collection) model.collection = this;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain', 'sample'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy', 'indexBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    options || (options = {});
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && noXhrPatch) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  var noXhrPatch =
    typeof window !== 'undefined' && !!window.ActiveXObject &&
      !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        router.execute(callback, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = decodeURI(this.location.pathname + this.location.search);
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        var frame = Backbone.$('<iframe src="javascript:0" tabindex="-1">');
        this.iframe = frame.hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + '#' + this.fragment);
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot() && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment);
        }

      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      fragment = this.fragment = this.getFragment(fragment);
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var url = this.root + (fragment = this.getFragment(fragment || ''));

      // Strip the hash for matching.
      fragment = fragment.replace(pathStripper, '');

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));

!function(e,n){"use strict";function r(e,n){var r,t,u=e.toLowerCase();for(n=[].concat(n),r=0;n.length>r;r+=1)if(t=n[r]){if(t.test&&t.test(e))return!0;if(t.toLowerCase()===u)return!0}}var t=n.prototype.trim,u=n.prototype.trimRight,i=n.prototype.trimLeft,l=function(e){return 1*e||0},o=function(e,n){if(1>n)return"";for(var r="";n>0;)1&n&&(r+=e),n>>=1,e+=e;return r},a=[].slice,c=function(e){return null==e?"\\s":e.source?e.source:"["+g.escapeRegExp(e)+"]"},s={lt:"<",gt:">",quot:'"',amp:"&",apos:"'"},f={};for(var p in s)f[s[p]]=p;f["'"]="#39";var h=function(){function e(e){return Object.prototype.toString.call(e).slice(8,-1).toLowerCase()}var r=o,t=function(){return t.cache.hasOwnProperty(arguments[0])||(t.cache[arguments[0]]=t.parse(arguments[0])),t.format.call(null,t.cache[arguments[0]],arguments)};return t.format=function(t,u){var i,l,o,a,c,s,f,p=1,g=t.length,d="",m=[];for(l=0;g>l;l++)if(d=e(t[l]),"string"===d)m.push(t[l]);else if("array"===d){if(a=t[l],a[2])for(i=u[p],o=0;a[2].length>o;o++){if(!i.hasOwnProperty(a[2][o]))throw new Error(h('[_.sprintf] property "%s" does not exist',a[2][o]));i=i[a[2][o]]}else i=a[1]?u[a[1]]:u[p++];if(/[^s]/.test(a[8])&&"number"!=e(i))throw new Error(h("[_.sprintf] expecting number but found %s",e(i)));switch(a[8]){case"b":i=i.toString(2);break;case"c":i=n.fromCharCode(i);break;case"d":i=parseInt(i,10);break;case"e":i=a[7]?i.toExponential(a[7]):i.toExponential();break;case"f":i=a[7]?parseFloat(i).toFixed(a[7]):parseFloat(i);break;case"o":i=i.toString(8);break;case"s":i=(i=n(i))&&a[7]?i.substring(0,a[7]):i;break;case"u":i=Math.abs(i);break;case"x":i=i.toString(16);break;case"X":i=i.toString(16).toUpperCase()}i=/[def]/.test(a[8])&&a[3]&&i>=0?"+"+i:i,s=a[4]?"0"==a[4]?"0":a[4].charAt(1):" ",f=a[6]-n(i).length,c=a[6]?r(s,f):"",m.push(a[5]?i+c:c+i)}return m.join("")},t.cache={},t.parse=function(e){for(var n=e,r=[],t=[],u=0;n;){if(null!==(r=/^[^\x25]+/.exec(n)))t.push(r[0]);else if(null!==(r=/^\x25{2}/.exec(n)))t.push("%");else{if(null===(r=/^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(n)))throw new Error("[_.sprintf] huh?");if(r[2]){u|=1;var i=[],l=r[2],o=[];if(null===(o=/^([a-z_][a-z_\d]*)/i.exec(l)))throw new Error("[_.sprintf] huh?");for(i.push(o[1]);""!==(l=l.substring(o[0].length));)if(null!==(o=/^\.([a-z_][a-z_\d]*)/i.exec(l)))i.push(o[1]);else{if(null===(o=/^\[(\d+)\]/.exec(l)))throw new Error("[_.sprintf] huh?");i.push(o[1])}r[2]=i}else u|=2;if(3===u)throw new Error("[_.sprintf] mixing positional and named placeholders is not (yet) supported");t.push(r)}n=n.substring(r[0].length)}return t},t}(),g={VERSION:"2.3.0",isBlank:function(e){return null==e&&(e=""),/^\s*$/.test(e)},stripTags:function(e){return null==e?"":n(e).replace(/<\/?[^>]+>/g,"")},capitalize:function(e){return e=null==e?"":n(e),e.charAt(0).toUpperCase()+e.slice(1)},chop:function(e,r){return null==e?[]:(e=n(e),r=~~r,r>0?e.match(new RegExp(".{1,"+r+"}","g")):[e])},clean:function(e){return g.strip(e).replace(/\s+/g," ")},count:function(e,r){if(null==e||null==r)return 0;e=n(e),r=n(r);for(var t=0,u=0,i=r.length;;){if(u=e.indexOf(r,u),-1===u)break;t++,u+=i}return t},chars:function(e){return null==e?[]:n(e).split("")},swapCase:function(e){return null==e?"":n(e).replace(/\S/g,function(e){return e===e.toUpperCase()?e.toLowerCase():e.toUpperCase()})},escapeHTML:function(e){return null==e?"":n(e).replace(/[&<>"']/g,function(e){return"&"+f[e]+";"})},unescapeHTML:function(e){return null==e?"":n(e).replace(/\&([^;]+);/g,function(e,r){var t;return r in s?s[r]:(t=r.match(/^#x([\da-fA-F]+)$/))?n.fromCharCode(parseInt(t[1],16)):(t=r.match(/^#(\d+)$/))?n.fromCharCode(~~t[1]):e})},escapeRegExp:function(e){return null==e?"":n(e).replace(/([.*+?^=!:${}()|[\]\/\\])/g,"\\$1")},splice:function(e,n,r,t){var u=g.chars(e);return u.splice(~~n,~~r,t),u.join("")},insert:function(e,n,r){return g.splice(e,n,0,r)},include:function(e,r){return""===r?!0:null==e?!1:-1!==n(e).indexOf(r)},join:function(){var e=a.call(arguments),n=e.shift();return null==n&&(n=""),e.join(n)},lines:function(e){return null==e?[]:n(e).split("\n")},reverse:function(e){return g.chars(e).reverse().join("")},startsWith:function(e,r){return""===r?!0:null==e||null==r?!1:(e=n(e),r=n(r),e.length>=r.length&&e.slice(0,r.length)===r)},endsWith:function(e,r){return""===r?!0:null==e||null==r?!1:(e=n(e),r=n(r),e.length>=r.length&&e.slice(e.length-r.length)===r)},succ:function(e){return null==e?"":(e=n(e),e.slice(0,-1)+n.fromCharCode(e.charCodeAt(e.length-1)+1))},titleize:function(e){return null==e?"":(e=n(e).toLowerCase(),e.replace(/(?:^|\s|-)\S/g,function(e){return e.toUpperCase()}))},camelize:function(e){return g.trim(e).replace(/[-_\s]+(.)?/g,function(e,n){return n?n.toUpperCase():""})},underscored:function(e){return g.trim(e).replace(/([a-z\d])([A-Z]+)/g,"$1_$2").replace(/[-\s]+/g,"_").toLowerCase()},dasherize:function(e){return g.trim(e).replace(/([A-Z])/g,"-$1").replace(/[-_\s]+/g,"-").toLowerCase()},classify:function(e){return g.titleize(n(e).replace(/[\W_]/g," ")).replace(/\s/g,"")},humanize:function(e){return g.capitalize(g.underscored(e).replace(/_id$/,"").replace(/_/g," "))},trim:function(e,r){return null==e?"":!r&&t?t.call(e):(r=c(r),n(e).replace(new RegExp("^"+r+"+|"+r+"+$","g"),""))},ltrim:function(e,r){return null==e?"":!r&&i?i.call(e):(r=c(r),n(e).replace(new RegExp("^"+r+"+"),""))},rtrim:function(e,r){return null==e?"":!r&&u?u.call(e):(r=c(r),n(e).replace(new RegExp(r+"+$"),""))},truncate:function(e,r,t){return null==e?"":(e=n(e),t=t||"...",r=~~r,e.length>r?e.slice(0,r)+t:e)},prune:function(e,r,t){if(null==e)return"";if(e=n(e),r=~~r,t=null!=t?n(t):"...",r>=e.length)return e;var u=function(e){return e.toUpperCase()!==e.toLowerCase()?"A":" "},i=e.slice(0,r+1).replace(/.(?=\W*\w*$)/g,u);return i=i.slice(i.length-2).match(/\w\w/)?i.replace(/\s*\S+$/,""):g.rtrim(i.slice(0,i.length-1)),(i+t).length>e.length?e:e.slice(0,i.length)+t},words:function(e,n){return g.isBlank(e)?[]:g.trim(e,n).split(n||/\s+/)},pad:function(e,r,t,u){e=null==e?"":n(e),r=~~r;var i=0;switch(t?t.length>1&&(t=t.charAt(0)):t=" ",u){case"right":return i=r-e.length,e+o(t,i);case"both":return i=r-e.length,o(t,Math.ceil(i/2))+e+o(t,Math.floor(i/2));default:return i=r-e.length,o(t,i)+e}},lpad:function(e,n,r){return g.pad(e,n,r)},rpad:function(e,n,r){return g.pad(e,n,r,"right")},lrpad:function(e,n,r){return g.pad(e,n,r,"both")},sprintf:h,vsprintf:function(e,n){return n.unshift(e),h.apply(null,n)},toNumber:function(e,n){return e?(e=g.trim(e),e.match(/^-?\d+(?:\.\d+)?$/)?l(l(e).toFixed(~~n)):0/0):0},numberFormat:function(e,n,r,t){if(isNaN(e)||null==e)return"";e=e.toFixed(~~n),t="string"==typeof t?t:",";var u=e.split("."),i=u[0],l=u[1]?(r||".")+u[1]:"";return i.replace(/(\d)(?=(?:\d{3})+$)/g,"$1"+t)+l},strRight:function(e,r){if(null==e)return"";e=n(e),r=null!=r?n(r):r;var t=r?e.indexOf(r):-1;return~t?e.slice(t+r.length,e.length):e},strRightBack:function(e,r){if(null==e)return"";e=n(e),r=null!=r?n(r):r;var t=r?e.lastIndexOf(r):-1;return~t?e.slice(t+r.length,e.length):e},strLeft:function(e,r){if(null==e)return"";e=n(e),r=null!=r?n(r):r;var t=r?e.indexOf(r):-1;return~t?e.slice(0,t):e},strLeftBack:function(e,n){if(null==e)return"";e+="",n=null!=n?""+n:n;var r=e.lastIndexOf(n);return~r?e.slice(0,r):e},toSentence:function(e,n,r,t){n=n||", ",r=r||" and ";var u=e.slice(),i=u.pop();return e.length>2&&t&&(r=g.rtrim(n)+r),u.length?u.join(n)+r+i:i},toSentenceSerial:function(){var e=a.call(arguments);return e[3]=!0,g.toSentence.apply(g,e)},slugify:function(e){if(null==e)return"";var r="ąàáäâãåæăćęèéëêìíïîłńòóöôõøśșțùúüûñçżź",t="aaaaaaaaaceeeeeiiiilnoooooosstuuuunczz",u=new RegExp(c(r),"g");return e=n(e).toLowerCase().replace(u,function(e){var n=r.indexOf(e);return t.charAt(n)||"-"}),g.dasherize(e.replace(/[^\w\s-]/g,""))},surround:function(e,n){return[n,e,n].join("")},quote:function(e,n){return g.surround(e,n||'"')},unquote:function(e,n){return n=n||'"',e[0]===n&&e[e.length-1]===n?e.slice(1,e.length-1):e},exports:function(){var e={};for(var n in this)this.hasOwnProperty(n)&&!n.match(/^(?:include|contains|reverse)$/)&&(e[n]=this[n]);return e},repeat:function(e,r,t){if(null==e)return"";if(r=~~r,null==t)return o(n(e),r);for(var u=[];r>0;u[--r]=e);return u.join(t)},naturalCmp:function(e,r){if(e==r)return 0;if(!e)return-1;if(!r)return 1;for(var t=/(\.\d+)|(\d+)|(\D+)/g,u=n(e).toLowerCase().match(t),i=n(r).toLowerCase().match(t),l=Math.min(u.length,i.length),o=0;l>o;o++){var a=u[o],c=i[o];if(a!==c){var s=parseInt(a,10);if(!isNaN(s)){var f=parseInt(c,10);if(!isNaN(f)&&s-f)return s-f}return c>a?-1:1}}return u.length===i.length?u.length-i.length:r>e?-1:1},levenshtein:function(e,r){if(null==e&&null==r)return 0;if(null==e)return n(r).length;if(null==r)return n(e).length;e=n(e),r=n(r);for(var t,u,i=[],l=0;r.length>=l;l++)for(var o=0;e.length>=o;o++)u=l&&o?e.charAt(o-1)===r.charAt(l-1)?t:Math.min(i[o],i[o-1],t)+1:l+o,t=i[o],i[o]=u;return i.pop()},toBoolean:function(e,n,t){return"number"==typeof e&&(e=""+e),"string"!=typeof e?!!e:(e=g.trim(e),r(e,n||["true","1"])?!0:r(e,t||["false","0"])?!1:void 0)}};g.strip=g.trim,g.lstrip=g.ltrim,g.rstrip=g.rtrim,g.center=g.lrpad,g.rjust=g.lpad,g.ljust=g.rpad,g.contains=g.include,g.q=g.quote,g.toBool=g.toBoolean,"undefined"!=typeof exports&&("undefined"!=typeof module&&module.exports&&(module.exports=g),exports._s=g),"function"==typeof define&&define.amd&&define("underscore.string",[],function(){return g}),e._=e._||{},e._.string=e._.str=g}(this,String);
// Generated by CoffeeScript 1.9.1
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

/*jshint expr:true eqnull:true */
/**
 *
 * Backbone.DeepModel v0.10.4
 *
 * Copyright (c) 2013 Charles Davison, Pow Media Ltd
 *
 * https://github.com/powmedia/backbone-deep-model
 * Licensed under the MIT License
 */

/**
 * Underscore mixins for deep objects
 *
 * Based on https://gist.github.com/echong/3861963
 */
(function() {
  var arrays, basicObjects, deepClone, deepExtend, deepExtendCouple, isBasicObject,
    __slice = [].slice;

  deepClone = function(obj) {
    var func, isArr;
    if (!_.isObject(obj) || _.isFunction(obj)) {
      return obj;
    }
    if (obj instanceof Backbone.Collection || obj instanceof Backbone.Model) {
      return obj;
    }
    if (_.isDate(obj)) {
      return new Date(obj.getTime());
    }
    if (_.isRegExp(obj)) {
      return new RegExp(obj.source, obj.toString().replace(/.*\//, ""));
    }
    isArr = _.isArray(obj || _.isArguments(obj));
    func = function(memo, value, key) {
      if (isArr) {
        memo.push(deepClone(value));
      } else {
        memo[key] = deepClone(value);
      }
      return memo;
    };
    return _.reduce(obj, func, isArr ? [] : {});
  };

  isBasicObject = function(object) {
    if (object == null) return false;
    return (object.prototype === {}.prototype || object.prototype === Object.prototype) && _.isObject(object) && !_.isArray(object) && !_.isFunction(object) && !_.isDate(object) && !_.isRegExp(object) && !_.isArguments(object);
  };

  basicObjects = function(object) {
    return _.filter(_.keys(object), function(key) {
      return isBasicObject(object[key]);
    });
  };

  arrays = function(object) {
    return _.filter(_.keys(object), function(key) {
      return _.isArray(object[key]);
    });
  };

  deepExtendCouple = function(destination, source, maxDepth) {
    var combine, recurse, sharedArrayKey, sharedArrayKeys, sharedObjectKey, sharedObjectKeys, _i, _j, _len, _len1;
    if (maxDepth == null) {
      maxDepth = 20;
    }
    if (maxDepth <= 0) {
      console.warn('_.deepExtend(): Maximum depth of recursion hit.');
      return _.extend(destination, source);
    }
    sharedObjectKeys = _.intersection(basicObjects(destination), basicObjects(source));
    recurse = function(key) {
      return source[key] = deepExtendCouple(destination[key], source[key], maxDepth - 1);
    };
    for (_i = 0, _len = sharedObjectKeys.length; _i < _len; _i++) {
      sharedObjectKey = sharedObjectKeys[_i];
      recurse(sharedObjectKey);
    }
    sharedArrayKeys = _.intersection(arrays(destination), arrays(source));
    combine = function(key) {
      return source[key] = _.union(destination[key], source[key]);
    };
    for (_j = 0, _len1 = sharedArrayKeys.length; _j < _len1; _j++) {
      sharedArrayKey = sharedArrayKeys[_j];
      combine(sharedArrayKey);
    }
    return _.extend(destination, source);
  };

  deepExtend = function() {
    var finalObj, maxDepth, objects, _i;
    objects = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), maxDepth = arguments[_i++];
    if (!_.isNumber(maxDepth)) {
      objects.push(maxDepth);
      maxDepth = 20;
    }
    if (objects.length <= 1) {
      return objects[0];
    }
    if (maxDepth <= 0) {
      return _.extend.apply(this, objects);
    }
    finalObj = objects.shift();
    while (objects.length > 0) {
      finalObj = deepExtendCouple(finalObj, deepClone(objects.shift()), maxDepth);
    }
    return finalObj;
  };

  _.mixin({
    deepClone: deepClone,
    isBasicObject: isBasicObject,
    basicObjects: basicObjects,
    arrays: arrays,
    deepExtend: deepExtend
  });

}).call(this);

/**
 * Main source
 */

;(function(factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['underscore', 'backbone'], factory);
    } else {
        // globals
        factory(_, Backbone);
    }
}(function(_, Backbone) {
    
    /**
     * Takes a nested object and returns a shallow object keyed with the path names
     * e.g. { "level1.level2": "value" }
     *
     * @param  {Object}      Nested object e.g. { level1: { level2: 'value' } }
     * @return {Object}      Shallow object with path names e.g. { 'level1.level2': 'value' }
     */
    function objToPaths(obj) {
        var ret = {},
            separator = DeepModel.keyPathSeparator;

        for (var key in obj) {
            var val = obj[key];

            if (val && val.constructor === Object && !_.isEmpty(val)) {
                //Recursion for embedded objects
                var obj2 = objToPaths(val);

                for (var key2 in obj2) {
                    var val2 = obj2[key2];

                    ret[key + separator + key2] = val2;
                }
            } else {
                ret[key] = val;
            }
        }

        return ret;
    }

    /**
     * @param {Object}  Object to fetch attribute from
     * @param {String}  Object path e.g. 'user.name'
     * @return {Mixed}
     */
    function getNested(obj, path, return_exists) {
        var separator = DeepModel.keyPathSeparator;

        var fields = path.split(separator);
        var result = obj;
        return_exists || (return_exists === false);
        for (var i = 0, n = fields.length; i < n; i++) {
            if (return_exists && !_.has(result, fields[i])) {
                return false;
            }
            result = result[fields[i]];

            if (result == null && i < n - 1) {
                result = {};
            }
            
            if (typeof result === 'undefined') {
                if (return_exists)
                {
                    return true;
                }
                return result;
            }
        }
        if (return_exists)
        {
            return true;
        }
        return result;
    }

    /**
     * @param {Object} obj                Object to fetch attribute from
     * @param {String} path               Object path e.g. 'user.name'
     * @param {Object} [options]          Options
     * @param {Boolean} [options.unset]   Whether to delete the value
     * @param {Mixed}                     Value to set
     */
    function setNested(obj, path, val, options) {
        options = options || {};

        var separator = DeepModel.keyPathSeparator;

        var fields = path.split(separator);
        var result = obj;
        for (var i = 0, n = fields.length; i < n && result !== undefined ; i++) {
            var field = fields[i];

            //If the last in the path, set the value
            if (i === n - 1) {
                options.unset ? delete result[field] : result[field] = val;
            } else {
                //Create the child object if it doesn't exist, or isn't an object
                if (typeof result[field] === 'undefined' || ! _.isObject(result[field])) {
                    result[field] = {};
                }

                //Move onto the next part of the path
                result = result[field];
            }
        }
    }

    function deleteNested(obj, path) {
      setNested(obj, path, null, { unset: true });
    }

    var DeepModel = Backbone.Model.extend({

        // Override constructor
        // Support having nested defaults by using _.deepExtend instead of _.extend
        constructor: function(attributes, options) {
            var defaults;
            var attrs = attributes || {};
            this.cid = _.uniqueId('c');
            this.attributes = {};
            if (options && options.collection) this.collection = options.collection;
            if (options && options.parse) attrs = this.parse(attrs, options) || {};
            if (defaults = _.result(this, 'defaults')) {
                //<custom code>
                // Replaced the call to _.defaults with _.deepExtend.
                attrs = _.deepExtend({}, defaults, attrs);
                //</custom code>
            }
            this.set(attrs, options);
            this.changed = {};
            this.initialize.apply(this, arguments);
        },

        // Return a copy of the model's `attributes` object.
        toJSON: function(options) {
          return _.deepClone(this.attributes);
        },

        // Override get
        // Supports nested attributes via the syntax 'obj.attr' e.g. 'author.user.name'
        get: function(attr) {
            return getNested(this.attributes, attr);
        },

        // Override set
        // Supports nested attributes via the syntax 'obj.attr' e.g. 'author.user.name'
        set: function(key, val, options) {
            var attr, attrs, unset, changes, silent, changing, prev, current;
            if (key == null) return this;
            
            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (typeof key === 'object') {
              attrs = key;
              options = val || {};
            } else {
              (attrs = {})[key] = val;
            }

            options || (options = {});
            
            // Run validation.
            if (!this._validate(attrs, options)) return false;

            // Extract attributes and options.
            unset           = options.unset;
            silent          = options.silent;
            changes         = [];
            changing        = this._changing;
            this._changing  = true;

            if (!changing) {
              this._previousAttributes = _.deepClone(this.attributes); //<custom>: Replaced _.clone with _.deepClone
              this.changed = {};
            }
            current = this.attributes, prev = this._previousAttributes;

            // Check for changes of `id`.
            if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

            //<custom code>
            attrs = objToPaths(attrs);
            //</custom code>

            // For each `set` attribute, update or delete the current value.
            for (attr in attrs) {
              val = attrs[attr];

              //<custom code>: Using getNested, setNested and deleteNested
              if (!_.isEqual(getNested(current, attr), val)) changes.push(attr);
              if (!_.isEqual(getNested(prev, attr), val)) {
                setNested(this.changed, attr, val);
              } else {
                deleteNested(this.changed, attr);
              }
              unset ? deleteNested(current, attr) : setNested(current, attr, val);
              //</custom code>
            }

            // Trigger all relevant attribute changes.
            if (!silent) {
              if (changes.length) this._pending = true;

              //<custom code>
              var separator = DeepModel.keyPathSeparator;

              for (var i = 0, l = changes.length; i < l; i++) {
                var key = changes[i];

                this.trigger('change:' + key, this, getNested(current, key), options);

                var fields = key.split(separator);

                //Trigger change events for parent keys with wildcard (*) notation
                for(var n = fields.length - 1; n > 0; n--) {
                  var parentKey = _.first(fields, n).join(separator),
                      wildcardKey = parentKey + separator + '*';

                  this.trigger('change:' + wildcardKey, this, getNested(current, parentKey), options);
                }
                //</custom code>
              }
            }

            if (changing) return this;
            if (!silent) {
              while (this._pending) {
                this._pending = false;
                this.trigger('change', this, options);
              }
            }
            this._pending = false;
            this._changing = false;
            return this;
        },

        // Clear all attributes on the model, firing `"change"` unless you choose
        // to silence it.
        clear: function(options) {
          var attrs = {};
          var shallowAttributes = objToPaths(this.attributes);
          for (var key in shallowAttributes) attrs[key] = void 0;
          return this.set(attrs, _.extend({}, options, {unset: true}));
        },

        // Determine if the model has changed since the last `"change"` event.
        // If you specify an attribute name, determine if that attribute has changed.
        hasChanged: function(attr) {
          if (attr == null) return !_.isEmpty(this.changed);
          return getNested(this.changed, attr) !== undefined;
        },

        // Return an object containing all the attributes that have changed, or
        // false if there are no changed attributes. Useful for determining what
        // parts of a view need to be updated and/or what attributes need to be
        // persisted to the server. Unset attributes will be set to undefined.
        // You can also pass an attributes object to diff against the model,
        // determining if there *would be* a change.
        changedAttributes: function(diff) {
          //<custom code>: objToPaths
          if (!diff) return this.hasChanged() ? objToPaths(this.changed) : false;
          //</custom code>

          var old = this._changing ? this._previousAttributes : this.attributes;
          
          //<custom code>
          diff = objToPaths(diff);
          old = objToPaths(old);
          //</custom code>

          var val, changed = false;
          for (var attr in diff) {
            if (_.isEqual(old[attr], (val = diff[attr]))) continue;
            (changed || (changed = {}))[attr] = val;
          }
          return changed;
        },

        // Get the previous value of an attribute, recorded at the time the last
        // `"change"` event was fired.
        previous: function(attr) {
          if (attr == null || !this._previousAttributes) return null;

          //<custom code>
          return getNested(this._previousAttributes, attr);
          //</custom code>
        },

        // Get all of the attributes of the model at the time of the previous
        // `"change"` event.
        previousAttributes: function() {
          //<custom code>
          return _.deepClone(this._previousAttributes);
          //</custom code>
        }
    });


    //Config; override in your app to customise
    DeepModel.keyPathSeparator = '.';


    //Exports
    Backbone.DeepModel = DeepModel;

    //For use in NodeJS
    if (typeof module != 'undefined') module.exports = DeepModel;
    
    return Backbone;

}));


// Rivets.js
// version: 0.5.2
// author: Michael Richards
// license: MIT
(function() {
  var Rivets,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Rivets = {};

  if (!String.prototype.trim) {
    String.prototype.trim = function() {
      return this.replace(/^\s+|\s+$/g, '');
    };
  }

  Rivets.Binding = (function() {
    function Binding(view, el, type, key, keypath, options) {
      var identifier, regexp, value, _ref;
      this.view = view;
      this.el = el;
      this.type = type;
      this.key = key;
      this.keypath = keypath;
      this.options = options != null ? options : {};
      this.update = __bind(this.update, this);
      this.unbind = __bind(this.unbind, this);
      this.bind = __bind(this.bind, this);
      this.publish = __bind(this.publish, this);
      this.sync = __bind(this.sync, this);
      this.set = __bind(this.set, this);
      this.formattedValue = __bind(this.formattedValue, this);
      if (!(this.binder = this.view.binders[this.type])) {
        _ref = this.view.binders;
        for (identifier in _ref) {
          value = _ref[identifier];
          if (identifier !== '*' && identifier.indexOf('*') !== -1) {
            regexp = new RegExp("^" + (identifier.replace('*', '.+')) + "$");
            if (regexp.test(this.type)) {
              this.binder = value;
              this.args = new RegExp("^" + (identifier.replace('*', '(.+)')) + "$").exec(this.type);
              this.args.shift();
            }
          }
        }
      }
      this.binder || (this.binder = this.view.binders['*']);
      if (this.binder instanceof Function) {
        this.binder = {
          routine: this.binder
        };
      }
      this.formatters = this.options.formatters || [];
      this.model = this.view.models[this.key];
    }

    Binding.prototype.formattedValue = function(value) {
      var args, formatter, id, _i, _len, _ref;
      _ref = this.formatters;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        formatter = _ref[_i];
        args = formatter.split(/\s+/);
        id = args.shift();
        formatter = this.model[id] instanceof Function ? this.model[id] : this.view.formatters[id];
        if ((formatter != null ? formatter.read : void 0) instanceof Function) {
          value = formatter.read.apply(formatter, [value].concat(__slice.call(args)));
        } else if (formatter instanceof Function) {
          value = formatter.apply(null, [value].concat(__slice.call(args)));
        }
      }
      return value;
    };

    Binding.prototype.set = function(value) {
      var _ref;
      value = value instanceof Function && !this.binder["function"] ? this.formattedValue(value.call(this.model)) : this.formattedValue(value);
      return (_ref = this.binder.routine) != null ? _ref.call(this, this.el, value) : void 0;
    };

    Binding.prototype.sync = function() {
      return this.set(this.options.bypass ? this.model[this.keypath] : this.view.config.adapter.read(this.model, this.keypath));
    };

    Binding.prototype.publish = function() {
      var args, formatter, id, value, _i, _len, _ref, _ref1, _ref2;
      value = Rivets.Util.getInputValue(this.el);
      _ref = this.formatters.slice(0).reverse();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        formatter = _ref[_i];
        args = formatter.split(/\s+/);
        id = args.shift();
        if ((_ref1 = this.view.formatters[id]) != null ? _ref1.publish : void 0) {
          value = (_ref2 = this.view.formatters[id]).publish.apply(_ref2, [value].concat(__slice.call(args)));
        }
      }
      return this.view.config.adapter.publish(this.model, this.keypath, value);
    };

    Binding.prototype.bind = function() {
      var dependency, keypath, model, _i, _len, _ref, _ref1, _ref2, _results;
      if ((_ref = this.binder.bind) != null) {
        _ref.call(this, this.el);
      }
      if (this.options.bypass) {
        this.sync();
      } else {
        this.view.config.adapter.subscribe(this.model, this.keypath, this.sync);
        if (this.view.config.preloadData) {
          this.sync();
        }
      }
      if ((_ref1 = this.options.dependencies) != null ? _ref1.length : void 0) {
        _ref2 = this.options.dependencies;
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          dependency = _ref2[_i];
          if (/^\./.test(dependency)) {
            model = this.model;
            keypath = dependency.substr(1);
          } else {
            dependency = dependency.split('.');
            model = this.view.models[dependency.shift()];
            keypath = dependency.join('.');
          }
          _results.push(this.view.config.adapter.subscribe(model, keypath, this.sync));
        }
        return _results;
      }
    };

    Binding.prototype.unbind = function() {
      var dependency, keypath, model, _i, _len, _ref, _ref1, _ref2, _results;
      if ((_ref = this.binder.unbind) != null) {
        _ref.call(this, this.el);
      }
      if (!this.options.bypass) {
        this.view.config.adapter.unsubscribe(this.model, this.keypath, this.sync);
      }
      if ((_ref1 = this.options.dependencies) != null ? _ref1.length : void 0) {
        _ref2 = this.options.dependencies;
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          dependency = _ref2[_i];
          if (/^\./.test(dependency)) {
            model = this.model;
            keypath = dependency.substr(1);
          } else {
            dependency = dependency.split('.');
            model = this.view.models[dependency.shift()];
            keypath = dependency.join('.');
          }
          _results.push(this.view.config.adapter.unsubscribe(model, keypath, this.sync));
        }
        return _results;
      }
    };

    Binding.prototype.update = function() {
      this.unbind();
      this.model = this.view.models[this.key];
      return this.bind();
    };

    return Binding;

  })();

  Rivets.View = (function() {
    function View(els, models, options) {
      var k, option, v, _base, _i, _len, _ref, _ref1, _ref2;
      this.els = els;
      this.models = models;
      this.options = options != null ? options : {};
      this.update = __bind(this.update, this);
      this.publish = __bind(this.publish, this);
      this.sync = __bind(this.sync, this);
      this.unbind = __bind(this.unbind, this);
      this.bind = __bind(this.bind, this);
      this.select = __bind(this.select, this);
      this.build = __bind(this.build, this);
      this.bindingRegExp = __bind(this.bindingRegExp, this);
      if (!(this.els.jquery || this.els instanceof Array)) {
        this.els = [this.els];
      }
      _ref = ['config', 'binders', 'formatters'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        this[option] = {};
        if (this.options[option]) {
          _ref1 = this.options[option];
          for (k in _ref1) {
            v = _ref1[k];
            this[option][k] = v;
          }
        }
        _ref2 = Rivets[option];
        for (k in _ref2) {
          v = _ref2[k];
          if ((_base = this[option])[k] == null) {
            _base[k] = v;
          }
        }
      }
      this.build();
    }

    View.prototype.bindingRegExp = function() {
      var prefix;
      prefix = this.config.prefix;
      if (prefix) {
        return new RegExp("^data-" + prefix + "-");
      } else {
        return /^data-/;
      }
    };

    View.prototype.build = function() {
      var bindingRegExp, el, node, parse, skipNodes, _i, _j, _len, _len1, _ref, _ref1,
        _this = this;
      this.bindings = [];
      skipNodes = [];
      bindingRegExp = this.bindingRegExp();
      parse = function(node) {
        var attribute, attributes, binder, context, ctx, dependencies, identifier, key, keypath, n, options, path, pipe, pipes, regexp, splitPath, type, value, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3;
        if (__indexOf.call(skipNodes, node) < 0) {
          _ref = node.attributes;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            attribute = _ref[_i];
            if (bindingRegExp.test(attribute.name)) {
              type = attribute.name.replace(bindingRegExp, '');
              if (!(binder = _this.binders[type])) {
                _ref1 = _this.binders;
                for (identifier in _ref1) {
                  value = _ref1[identifier];
                  if (identifier !== '*' && identifier.indexOf('*') !== -1) {
                    regexp = new RegExp("^" + (identifier.replace('*', '.+')) + "$");
                    if (regexp.test(type)) {
                      binder = value;
                    }
                  }
                }
              }
              binder || (binder = _this.binders['*']);
              if (binder.block) {
                _ref2 = node.getElementsByTagName('*');
                for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
                  n = _ref2[_j];
                  skipNodes.push(n);
                }
                attributes = [attribute];
              }
            }
          }
          _ref3 = attributes || node.attributes;
          for (_k = 0, _len2 = _ref3.length; _k < _len2; _k++) {
            attribute = _ref3[_k];
            if (bindingRegExp.test(attribute.name)) {
              options = {};
              type = attribute.name.replace(bindingRegExp, '');
              pipes = (function() {
                var _l, _len3, _ref4, _results;
                _ref4 = attribute.value.split('|');
                _results = [];
                for (_l = 0, _len3 = _ref4.length; _l < _len3; _l++) {
                  pipe = _ref4[_l];
                  _results.push(pipe.trim());
                }
                return _results;
              })();
              context = (function() {
                var _l, _len3, _ref4, _results;
                _ref4 = pipes.shift().split('<');
                _results = [];
                for (_l = 0, _len3 = _ref4.length; _l < _len3; _l++) {
                  ctx = _ref4[_l];
                  _results.push(ctx.trim());
                }
                return _results;
              })();
              path = context.shift();
              splitPath = path.split(/\.|:/);
              options.formatters = pipes;
              options.bypass = path.indexOf(':') !== -1;
              if (splitPath[0]) {
                key = splitPath.shift();
              } else {
                key = null;
                splitPath.shift();
              }
              keypath = splitPath.join('.');
              if (_this.models[key] != null) {
                if (dependencies = context.shift()) {
                  options.dependencies = dependencies.split(/\s+/);
                }
                _this.bindings.push(new Rivets.Binding(_this, node, type, key, keypath, options));
              }
            }
          }
          if (attributes) {
            attributes = null;
          }
        }
      };
      _ref = this.els;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        el = _ref[_i];
        parse(el);
        _ref1 = el.getElementsByTagName('*');
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          node = _ref1[_j];
          if (node.attributes != null) {
            parse(node);
          }
        }
      }
    };

    View.prototype.select = function(fn) {
      var binding, _i, _len, _ref, _results;
      _ref = this.bindings;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        binding = _ref[_i];
        if (fn(binding)) {
          _results.push(binding);
        }
      }
      return _results;
    };

    View.prototype.bind = function() {
      var binding, _i, _len, _ref, _results;
      _ref = this.bindings;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        binding = _ref[_i];
        _results.push(binding.bind());
      }
      return _results;
    };

    View.prototype.unbind = function() {
      var binding, _i, _len, _ref, _results;
      _ref = this.bindings;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        binding = _ref[_i];
        _results.push(binding.unbind());
      }
      return _results;
    };

    View.prototype.sync = function() {
      var binding, _i, _len, _ref, _results;
      _ref = this.bindings;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        binding = _ref[_i];
        _results.push(binding.sync());
      }
      return _results;
    };

    View.prototype.publish = function() {
      var binding, _i, _len, _ref, _results;
      _ref = this.select(function(b) {
        return b.binder.publishes;
      });
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        binding = _ref[_i];
        _results.push(binding.publish());
      }
      return _results;
    };

    View.prototype.update = function(models) {
      var binding, key, model, _results;
      if (models == null) {
        models = {};
      }
      _results = [];
      for (key in models) {
        model = models[key];
        this.models[key] = model;
        _results.push((function() {
          var _i, _len, _ref, _results1;
          _ref = this.select(function(b) {
            return b.key === key;
          });
          _results1 = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            binding = _ref[_i];
            _results1.push(binding.update());
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    return View;

  })();

  Rivets.Util = {
    bindEvent: function(el, event, handler, view) {
      var fn;
      fn = function(ev) {
        return handler.call(this, ev, view);
      };
      if (window.jQuery != null) {
        el = jQuery(el);
        if (el.on != null) {
          el.on(event, fn);
        } else {
          el.bind(event, fn);
        }
      } else if (window.addEventListener != null) {
        el.addEventListener(event, fn, false);
      } else {
        event = 'on' + event;
        el.attachEvent(event, fn);
      }
      return fn;
    },
    unbindEvent: function(el, event, fn) {
      if (window.jQuery != null) {
        el = jQuery(el);
        if (el.off != null) {
          return el.off(event, fn);
        } else {
          return el.unbind(event, fn);
        }
      } else if (window.removeEventListener) {
        return el.removeEventListener(event, fn, false);
      } else {
        event = 'on' + event;
        return el.detachEvent(event, fn);
      }
    },
    getInputValue: function(el) {
      var o, _i, _len, _results;
      if (window.jQuery != null) {
        el = jQuery(el);
        switch (el[0].type) {
          case 'checkbox':
            return el.is(':checked');
          default:
            return el.val();
        }
      } else {
        switch (el.type) {
          case 'checkbox':
            return el.checked;
          case 'select-multiple':
            _results = [];
            for (_i = 0, _len = el.length; _i < _len; _i++) {
              o = el[_i];
              if (o.selected) {
                _results.push(o.value);
              }
            }
            return _results;
            break;
          default:
            return el.value;
        }
      }
    }
  };

  Rivets.binders = {
    enabled: function(el, value) {
      return el.disabled = !value;
    },
    disabled: function(el, value) {
      return el.disabled = !!value;
    },
    checked: {
      publishes: true,
      bind: function(el) {
        return this.currentListener = Rivets.Util.bindEvent(el, 'change', this.publish);
      },
      unbind: function(el) {
        return Rivets.Util.unbindEvent(el, 'change', this.currentListener);
      },
      routine: function(el, value) {
        var _ref;
        if (el.type === 'radio') {
          return el.checked = ((_ref = el.value) != null ? _ref.toString() : void 0) === (value != null ? value.toString() : void 0);
        } else {
          return el.checked = !!value;
        }
      }
    },
    unchecked: {
      publishes: true,
      bind: function(el) {
        return this.currentListener = Rivets.Util.bindEvent(el, 'change', this.publish);
      },
      unbind: function(el) {
        return Rivets.Util.unbindEvent(el, 'change', this.currentListener);
      },
      routine: function(el, value) {
        var _ref;
        if (el.type === 'radio') {
          return el.checked = ((_ref = el.value) != null ? _ref.toString() : void 0) !== (value != null ? value.toString() : void 0);
        } else {
          return el.checked = !value;
        }
      }
    },
    show: function(el, value) {
      return el.style.display = value ? '' : 'none';
    },
    hide: function(el, value) {
      return el.style.display = value ? 'none' : '';
    },
    html: function(el, value) {
      return el.innerHTML = value != null ? value : '';
    },
    value: {
      publishes: true,
      bind: function(el) {
        return this.currentListener = Rivets.Util.bindEvent(el, 'change', this.publish);
      },
      unbind: function(el) {
        return Rivets.Util.unbindEvent(el, 'change', this.currentListener);
      },
      routine: function(el, value) {
        var o, _i, _len, _ref, _ref1, _ref2, _results;
        if (window.jQuery != null) {
          el = jQuery(el);
          if ((value != null ? value.toString() : void 0) !== ((_ref = el.val()) != null ? _ref.toString() : void 0)) {
            return el.val(value != null ? value : '');
          }
        } else {
          if (el.type === 'select-multiple') {
            if (value != null) {
              _results = [];
              for (_i = 0, _len = el.length; _i < _len; _i++) {
                o = el[_i];
                _results.push(o.selected = (_ref1 = o.value, __indexOf.call(value, _ref1) >= 0));
              }
              return _results;
            }
          } else if ((value != null ? value.toString() : void 0) !== ((_ref2 = el.value) != null ? _ref2.toString() : void 0)) {
            return el.value = value != null ? value : '';
          }
        }
      }
    },
    text: function(el, value) {
      if (el.innerText != null) {
        return el.innerText = value != null ? value : '';
      } else {
        return el.textContent = value != null ? value : '';
      }
    },
    "on-*": {
      "function": true,
      routine: function(el, value) {
        if (this.currentListener) {
          Rivets.Util.unbindEvent(el, this.args[0], this.currentListener);
        }
        return this.currentListener = Rivets.Util.bindEvent(el, this.args[0], value, this.view);
      }
    },
    "each-*": {
      block: true,
      bind: function(el, collection) {
        return el.removeAttribute(['data', this.view.config.prefix, this.type].join('-').replace('--', '-'));
      },
      unbind: function(el, collection) {
        var view, _i, _len, _ref, _results;
        if (this.iterated != null) {
          _ref = this.iterated;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            view = _ref[_i];
            _results.push(view.unbind());
          }
          return _results;
        }
      },
      routine: function(el, collection) {
        var data, e, item, itemEl, k, m, n, options, previous, v, view, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3, _ref4, _results;
        if (this.iterated != null) {
          _ref = this.iterated;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            view = _ref[_i];
            view.unbind();
            _ref1 = view.els;
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              e = _ref1[_j];
              e.parentNode.removeChild(e);
            }
          }
        } else {
          this.marker = document.createComment(" rivets: " + this.type + " ");
          el.parentNode.insertBefore(this.marker, el);
          el.parentNode.removeChild(el);
        }
        this.iterated = [];
        if (collection) {
          _results = [];
          for (_k = 0, _len2 = collection.length; _k < _len2; _k++) {
            item = collection[_k];
            data = {};
            _ref2 = this.view.models;
            for (n in _ref2) {
              m = _ref2[n];
              data[n] = m;
            }
            data[this.args[0]] = item;
            itemEl = el.cloneNode(true);
            previous = this.iterated.length ? this.iterated[this.iterated.length - 1].els[0] : this.marker;
            this.marker.parentNode.insertBefore(itemEl, (_ref3 = previous.nextSibling) != null ? _ref3 : null);
            options = {
              binders: this.view.options.binders,
              formatters: this.view.options.binders,
              config: {}
            };
            if (this.view.options.config) {
              _ref4 = this.view.options.config;
              for (k in _ref4) {
                v = _ref4[k];
                options.config[k] = v;
              }
            }
            options.config.preloadData = true;
            view = new Rivets.View(itemEl, data, options);
            view.bind();
            _results.push(this.iterated.push(view));
          }
          return _results;
        }
      }
    },
    "class-*": function(el, value) {
      var elClass;
      elClass = " " + el.className + " ";
      if (!value === (elClass.indexOf(" " + this.args[0] + " ") !== -1)) {
        return el.className = value ? "" + el.className + " " + this.args[0] : elClass.replace(" " + this.args[0] + " ", ' ').trim();
      }
    },
    "*": function(el, value) {
      if (value) {
        return el.setAttribute(this.type, value);
      } else {
        return el.removeAttribute(this.type);
      }
    }
  };

  Rivets.config = {
    preloadData: true
  };

  Rivets.formatters = {};

  Rivets.factory = function(exports) {
    exports.binders = Rivets.binders;
    exports.formatters = Rivets.formatters;
    exports.config = Rivets.config;
    exports.configure = function(options) {
      var property, value;
      if (options == null) {
        options = {};
      }
      for (property in options) {
        value = options[property];
        Rivets.config[property] = value;
      }
    };
    return exports.bind = function(el, models, options) {
      var view;
      if (models == null) {
        models = {};
      }
      if (options == null) {
        options = {};
      }
      view = new Rivets.View(el, models, options);
      view.bind();
      return view;
    };
  };

  if (typeof exports === 'object') {
    Rivets.factory(exports);
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      Rivets.factory(this.rivets = exports);
      return exports;
    });
  } else {
    Rivets.factory(this.rivets = {});
  }

}).call(this);

var ISOCountryNames = {
  "AF": "Afghanistan",
  "AX": "Åland Islands",
  "AL": "Albania",
  "DZ": "Algeria",
  "AS": "American Samoa",
  "AD": "Andorra",
  "AO": "Angola",
  "AI": "Anguilla",
  "AQ": "Antarctica",
  "AG": "Antigua and Barbuda",
  "AR": "Argentina",
  "AM": "Armenia",
  "AW": "Aruba",
  "AU": "Australia",
  "AT": "Austria",
  "AZ": "Azerbaijan",
  "BS": "Bahamas",
  "BH": "Bahrain",
  "BD": "Bangladesh",
  "BB": "Barbados",
  "BY": "Belarus",
  "BE": "Belgium",
  "BZ": "Belize",
  "BJ": "Benin",
  "BM": "Bermuda",
  "BT": "Bhutan",
  "BO": "Bolivia, Plurinational State of",
  "BQ": "Bonaire, Sint Eustatius and Saba",
  "BA": "Bosnia and Herzegovina",
  "BW": "Botswana",
  "BV": "Bouvet Island",
  "BR": "Brazil",
  "IO": "British Indian Ocean Territory",
  "BN": "Brunei Darussalam",
  "BG": "Bulgaria",
  "BF": "Burkina Faso",
  "BI": "Burundi",
  "KH": "Cambodia",
  "CM": "Cameroon",
  "CA": "Canada",
  "CV": "Cape Verde",
  "KY": "Cayman Islands",
  "CF": "Central African Republic",
  "TD": "Chad",
  "CL": "Chile",
  "CN": "China",
  "CX": "Christmas Island",
  "CC": "Cocos (Keeling) Islands",
  "CO": "Colombia",
  "KM": "Comoros",
  "CG": "Congo",
  "CD": "Congo, the Democratic Republic of the",
  "CK": "Cook Islands",
  "CR": "Costa Rica",
  "CI": "Côte d'Ivoire",
  "HR": "Croatia",
  "CU": "Cuba",
  "CW": "Curaçao",
  "CY": "Cyprus",
  "CZ": "Czech Republic",
  "DK": "Denmark",
  "DJ": "Djibouti",
  "DM": "Dominica",
  "DO": "Dominican Republic",
  "EC": "Ecuador",
  "EG": "Egypt",
  "SV": "El Salvador",
  "GQ": "Equatorial Guinea",
  "ER": "Eritrea",
  "EE": "Estonia",
  "ET": "Ethiopia",
  "FK": "Falkland Islands (Malvinas)",
  "FO": "Faroe Islands",
  "FJ": "Fiji",
  "FI": "Finland",
  "FR": "France",
  "GF": "French Guiana",
  "PF": "French Polynesia",
  "TF": "French Southern Territories",
  "GA": "Gabon",
  "GM": "Gambia",
  "GE": "Georgia",
  "DE": "Germany",
  "GH": "Ghana",
  "GI": "Gibraltar",
  "GR": "Greece",
  "GL": "Greenland",
  "GD": "Grenada",
  "GP": "Guadeloupe",
  "GU": "Guam",
  "GT": "Guatemala",
  "GG": "Guernsey",
  "GN": "Guinea",
  "GW": "Guinea-Bissau",
  "GY": "Guyana",
  "HT": "Haiti",
  "HM": "Heard Island and McDonald Mcdonald Islands",
  "VA": "Holy See (Vatican City State)",
  "HN": "Honduras",
  "HK": "Hong Kong",
  "HU": "Hungary",
  "IS": "Iceland",
  "IN": "India",
  "ID": "Indonesia",
  "IR": "Iran, Islamic Republic of",
  "IQ": "Iraq",
  "IE": "Ireland",
  "IM": "Isle of Man",
  "IL": "Israel",
  "IT": "Italy",
  "JM": "Jamaica",
  "JP": "Japan",
  "JE": "Jersey",
  "JO": "Jordan",
  "KZ": "Kazakhstan",
  "KE": "Kenya",
  "KI": "Kiribati",
  "KP": "Korea, Democratic People's Republic of",
  "KR": "Korea, Republic of",
  "KW": "Kuwait",
  "KG": "Kyrgyzstan",
  "LA": "Lao People's Democratic Republic",
  "LV": "Latvia",
  "LB": "Lebanon",
  "LS": "Lesotho",
  "LR": "Liberia",
  "LY": "Libya",
  "LI": "Liechtenstein",
  "LT": "Lithuania",
  "LU": "Luxembourg",
  "MO": "Macao",
  "MK": "Macedonia, the Former Yugoslav Republic of",
  "MG": "Madagascar",
  "MW": "Malawi",
  "MY": "Malaysia",
  "MV": "Maldives",
  "ML": "Mali",
  "MT": "Malta",
  "MH": "Marshall Islands",
  "MQ": "Martinique",
  "MR": "Mauritania",
  "MU": "Mauritius",
  "YT": "Mayotte",
  "MX": "Mexico",
  "FM": "Micronesia, Federated States of",
  "MD": "Moldova, Republic of",
  "MC": "Monaco",
  "MN": "Mongolia",
  "ME": "Montenegro",
  "MS": "Montserrat",
  "MA": "Morocco",
  "MZ": "Mozambique",
  "MM": "Myanmar",
  "NA": "Namibia",
  "NR": "Nauru",
  "NP": "Nepal",
  "NL": "Netherlands",
  "NC": "New Caledonia",
  "NZ": "New Zealand",
  "NI": "Nicaragua",
  "NE": "Niger",
  "NG": "Nigeria",
  "NU": "Niue",
  "NF": "Norfolk Island",
  "MP": "Northern Mariana Islands",
  "NO": "Norway",
  "OM": "Oman",
  "PK": "Pakistan",
  "PW": "Palau",
  "PS": "Palestine, State of",
  "PA": "Panama",
  "PG": "Papua New Guinea",
  "PY": "Paraguay",
  "PE": "Peru",
  "PH": "Philippines",
  "PN": "Pitcairn",
  "PL": "Poland",
  "PT": "Portugal",
  "PR": "Puerto Rico",
  "QA": "Qatar",
  "RE": "Réunion",
  "RO": "Romania",
  "RU": "Russian Federation",
  "RW": "Rwanda",
  "BL": "Saint Barthélemy",
  "SH": "Saint Helena, Ascension and Tristan da Cunha",
  "KN": "Saint Kitts and Nevis",
  "LC": "Saint Lucia",
  "MF": "Saint Martin (French part)",
  "PM": "Saint Pierre and Miquelon",
  "VC": "Saint Vincent and the Grenadines",
  "WS": "Samoa",
  "SM": "San Marino",
  "ST": "Sao Tome and Principe",
  "SA": "Saudi Arabia",
  "SN": "Senegal",
  "RS": "Serbia",
  "SC": "Seychelles",
  "SL": "Sierra Leone",
  "SG": "Singapore",
  "SX": "Sint Maarten (Dutch part)",
  "SK": "Slovakia",
  "SI": "Slovenia",
  "SB": "Solomon Islands",
  "SO": "Somalia",
  "ZA": "South Africa",
  "GS": "South Georgia and the South Sandwich Islands",
  "SS": "South Sudan",
  "ES": "Spain",
  "LK": "Sri Lanka",
  "SD": "Sudan",
  "SR": "Suriname",
  "SJ": "Svalbard and Jan Mayen",
  "SZ": "Swaziland",
  "SE": "Sweden",
  "CH": "Switzerland",
  "SY": "Syrian Arab Republic",
  "TW": "Taiwan, Province of China",
  "TJ": "Tajikistan",
  "TZ": "Tanzania, United Republic of",
  "TH": "Thailand",
  "TL": "Timor-Leste",
  "TG": "Togo",
  "TK": "Tokelau",
  "TO": "Tonga",
  "TT": "Trinidad and Tobago",
  "TN": "Tunisia",
  "TR": "Turkey",
  "TM": "Turkmenistan",
  "TC": "Turks and Caicos Islands",
  "TV": "Tuvalu",
  "UG": "Uganda",
  "UA": "Ukraine",
  "AE": "United Arab Emirates",
  "GB": "United Kingdom",
  "US": "United States",
  "UM": "United States Minor Outlying Islands",
  "UY": "Uruguay",
  "UZ": "Uzbekistan",
  "VU": "Vanuatu",
  "VE": "Venezuela, Bolivarian Republic of",
  "VN": "Viet Nam",
  "VG": "Virgin Islands, British",
  "VI": "Virgin Islands, U.S.",
  "WF": "Wallis and Futuna",
  "EH": "Western Sahara",
  "YE": "Yemen",
  "ZM": "Zambia",
  "ZW": "Zimbabwe",
};
var scripts;scripts={},window.requireOnce=function(a,b){return"undefined"==typeof scripts[a]?(scripts[a]=[],null!=b&&scripts[a].push(b),$.getScript(a,function(){var c,d,e;for(e=scripts[a],c=0,d=e.length;d>c;c++)b=e[c],b();return scripts[a]=!0})):scripts[a]===!0?"function"==typeof b?b():void 0:null!=b?scripts[a].push(b):void 0};
!function(t){"use strict";function r(t){var r={path:!0,query:!0,hash:!0};return t?(/^[a-z]+:/.test(t)&&(r.protocol=!0,r.host=!0,/[-a-z0-9]+(\.[-a-z0-9])*:\d+/i.test(t)&&(r.port=!0),/\/\/(.*?)(?::(.*?))?@/.test(t)&&(r.user=!0,r.pass=!0)),r):r}function e(t,e,o){var u,f,l,y=h?"file://"+(process.platform.match(/^win/i)?"/":"")+p("fs").realpathSync("."):document.location.href;e||(e=y),h?u=p("url").parse(e):(u=document.createElement("a"),u.href=e);var d=r(e);l=e.match(/\/\/(.*?)(?::(.*?))?@/)||[];for(f in a)t[f]=d[f]?u[a[f]]||"":"";if(t.protocol=t.protocol.replace(/:$/,""),t.query=t.query.replace(/^\?/,""),t.hash=s(t.hash.replace(/^#/,"")),t.user=s(l[1]||""),t.pass=s(l[2]||""),t.port=c[t.protocol]==t.port||0==t.port?"":t.port,!d.protocol&&/[^\/#?]/.test(e.charAt(0))&&(t.path=e.split("?")[0].split("#")[0]),!d.protocol&&o){var g=new n(y.match(/(.*\/)/)[0]),m=g.path.split("/"),v=t.path.split("/"),q=["protocol","user","pass","host","port"],w=q.length;for(m.pop(),f=0;w>f;f++)t[q[f]]=g[q[f]];for(;".."===v[0];)m.pop(),v.shift();t.path=("/"!==e.charAt(0)?m.join("/"):"")+"/"+v.join("/")}t.path=t.path.replace(/^\/{2,}/,"/"),t.paths(("/"===t.path.charAt(0)?t.path.slice(1):t.path).split("/")),t.query=new i(t.query)}function o(t){return encodeURIComponent(t).replace(/'/g,"%27")}function s(t){return t=t.replace(/\+/g," "),t=t.replace(/%([ef][0-9a-f])%([89ab][0-9a-f])%([89ab][0-9a-f])/gi,function(t,r,e,o){var s=parseInt(r,16)-224,i=parseInt(e,16)-128;if(0===s&&32>i)return t;var n=parseInt(o,16)-128,h=(s<<12)+(i<<6)+n;return h>65535?t:String.fromCharCode(h)}),t=t.replace(/%([cd][0-9a-f])%([89ab][0-9a-f])/gi,function(t,r,e){var o=parseInt(r,16)-192;if(2>o)return t;var s=parseInt(e,16)-128;return String.fromCharCode((o<<6)+s)}),t.replace(/%([0-7][0-9a-f])/gi,function(t,r){return String.fromCharCode(parseInt(r,16))})}function i(t){for(var r,e=/([^=&]+)(=([^&]*))?/g;r=e.exec(t);){var o=decodeURIComponent(r[1].replace(/\+/g," ")),i=r[3]?s(r[3]):"";void 0!==this[o]&&null!==this[o]?(this[o]instanceof Array||(this[o]=[this[o]]),this[o].push(i)):this[o]=i}}function n(t,r){e(this,t,!r)}var h="undefined"==typeof window&&"undefined"!=typeof global&&"function"==typeof require,p=h?t.require:null,a={protocol:"protocol",host:"hostname",port:"port",path:"pathname",query:"search",hash:"hash"},c={ftp:21,gopher:70,http:80,https:443,ws:80,wss:443};i.prototype.toString=function(){var t,r,e="",s=o;for(t in this)if(!(this[t]instanceof Function||null===this[t]))if(this[t]instanceof Array){var i=this[t].length;if(i)for(r=0;i>r;r++)e+=e?"&":"",e+=s(t)+"="+s(this[t][r]);else e+=(e?"&":"")+s(t)+"="}else e+=e?"&":"",e+=s(t)+"="+s(this[t]);return e},n.prototype.clearQuery=function(){for(var t in this.query)this.query[t]instanceof Function||delete this.query[t];return this},n.prototype.queryLength=function(){var t,r=0;for(t in this)this[t]instanceof Function||r++;return r},n.prototype.isEmptyQuery=function(){return 0===this.queryLength()},n.prototype.paths=function(t){var r,e="",i=0;if(t&&t.length&&t+""!==t){for(this.isAbsolute()&&(e="/"),r=t.length;r>i;i++)t[i]=!i&&t[i].match(/^\w:$/)?t[i]:o(t[i]);this.path=e+t.join("/")}for(t=("/"===this.path.charAt(0)?this.path.slice(1):this.path).split("/"),i=0,r=t.length;r>i;i++)t[i]=s(t[i]);return t},n.prototype.encode=o,n.prototype.decode=s,n.prototype.isAbsolute=function(){return this.protocol||"/"===this.path.charAt(0)},n.prototype.toString=function(){return(this.protocol&&this.protocol+"://")+(this.user&&o(this.user)+(this.pass&&":"+o(this.pass))+"@")+(this.host&&this.host)+(this.port&&":"+this.port)+(this.path&&this.path)+(this.query.toString()&&"?"+this.query)+(this.hash&&"#"+o(this.hash))},t[t.exports?"exports":"Url"]=n}("undefined"!=typeof module&&module.exports?module:window);
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.DOMPurify=t()}(this,function(){"use strict";function e(e,t){for(var n=t.length;n--;)"string"==typeof t[n]&&(t[n]=t[n].toLowerCase()),e[t[n]]=!0;return e}function t(e){var t={},n=void 0;for(n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);return t}function n(e){if(Array.isArray(e)){for(var t=0,n=Array(e.length);t<e.length;t++)n[t]=e[t];return n}return Array.from(e)}function r(){var x=arguments.length>0&&void 0!==arguments[0]?arguments[0]:A(),S=function(e){return r(e)};if(S.version="1.0.8",S.removed=[],!x||!x.document||9!==x.document.nodeType)return S.isSupported=!1,S;var k=x.document,w=!1,L=!1,E=x.document,O=x.DocumentFragment,M=x.HTMLTemplateElement,N=x.Node,_=x.NodeFilter,D=x.NamedNodeMap,C=void 0===D?x.NamedNodeMap||x.MozNamedAttrMap:D,R=x.Text,F=x.Comment,z=x.DOMParser;if("function"==typeof M){var H=E.createElement("template");H.content&&H.content.ownerDocument&&(E=H.content.ownerDocument)}var I=E,j=I.implementation,P=I.createNodeIterator,U=I.getElementsByTagName,W=I.createDocumentFragment,B=k.importNode,G={};S.isSupported=j&&void 0!==j.createHTMLDocument&&9!==E.documentMode;var q=f,V=p,Y=h,K=g,X=v,$=b,J=y,Q=null,Z=e({},[].concat(n(o),n(i),n(a),n(l),n(s))),ee=null,te=e({},[].concat(n(c),n(d),n(u),n(m))),ne=null,re=null,oe=!0,ie=!0,ae=!1,le=!1,se=!1,ce=!1,de=!1,ue=!1,me=!1,fe=!1,pe=!1,he=!0,ge=!0,ye=!1,ve={},be=e({},["audio","head","math","script","style","template","svg","video"]),Te=e({},["audio","video","img","source","image"]),Ae=e({},["alt","class","for","id","label","name","pattern","placeholder","summary","title","value","style","xmlns"]),xe=null,Se=E.createElement("form"),ke=function(r){"object"!==(void 0===r?"undefined":T(r))&&(r={}),Q="ALLOWED_TAGS"in r?e({},r.ALLOWED_TAGS):Z,ee="ALLOWED_ATTR"in r?e({},r.ALLOWED_ATTR):te,ne="FORBID_TAGS"in r?e({},r.FORBID_TAGS):{},re="FORBID_ATTR"in r?e({},r.FORBID_ATTR):{},ve="USE_PROFILES"in r&&r.USE_PROFILES,oe=!1!==r.ALLOW_ARIA_ATTR,ie=!1!==r.ALLOW_DATA_ATTR,ae=r.ALLOW_UNKNOWN_PROTOCOLS||!1,le=r.SAFE_FOR_JQUERY||!1,se=r.SAFE_FOR_TEMPLATES||!1,ce=r.WHOLE_DOCUMENT||!1,me=r.RETURN_DOM||!1,fe=r.RETURN_DOM_FRAGMENT||!1,pe=r.RETURN_DOM_IMPORT||!1,ue=r.FORCE_BODY||!1,he=!1!==r.SANITIZE_DOM,ge=!1!==r.KEEP_CONTENT,ye=r.IN_PLACE||!1,J=r.ALLOWED_URI_REGEXP||J,se&&(ie=!1),fe&&(me=!0),ve&&(Q=e({},[].concat(n(s))),ee=[],!0===ve.html&&(e(Q,o),e(ee,c)),!0===ve.svg&&(e(Q,i),e(ee,d),e(ee,m)),!0===ve.svgFilters&&(e(Q,a),e(ee,d),e(ee,m)),!0===ve.mathMl&&(e(Q,l),e(ee,u),e(ee,m))),r.ADD_TAGS&&(Q===Z&&(Q=t(Q)),e(Q,r.ADD_TAGS)),r.ADD_ATTR&&(ee===te&&(ee=t(ee)),e(ee,r.ADD_ATTR)),r.ADD_URI_SAFE_ATTR&&e(Ae,r.ADD_URI_SAFE_ATTR),ge&&(Q["#text"]=!0),ce&&e(Q,["html","head","body"]),Q.table&&e(Q,["tbody"]),Object&&"freeze"in Object&&Object.freeze(r),xe=r},we=function(e){S.removed.push({element:e});try{e.parentNode.removeChild(e)}catch(t){e.outerHTML=""}},Le=function(e,t){try{S.removed.push({attribute:t.getAttributeNode(e),from:t})}catch(e){S.removed.push({attribute:null,from:t})}t.removeAttribute(e)},Ee=function(t){var n=void 0;if(ue&&(t="<remove></remove>"+t),w)try{n=(new z).parseFromString(t,"text/html")}catch(e){}if(L&&e(ne,["title"]),!n||!n.documentElement){var r=(n=j.createHTMLDocument("")).body;r.parentNode.removeChild(r.parentNode.firstElementChild),r.outerHTML=t}return U.call(n,ce?"html":"body")[0]};S.isSupported&&(function(){try{Ee('<svg><p><style><img src="</style><img src=x onerror=alert(1)//">').querySelector("svg img")&&(w=!0)}catch(e){}}(),function(){try{Ee("<x/><title>&lt;/title&gt;&lt;img&gt;").querySelector("title").textContent.match(/<\/title/)&&(L=!0)}catch(e){}}());var Oe=function(e){return P.call(e.ownerDocument||e,e,_.SHOW_ELEMENT|_.SHOW_COMMENT|_.SHOW_TEXT,function(){return _.FILTER_ACCEPT},!1)},Me=function(e){return!(e instanceof R||e instanceof F)&&!("string"==typeof e.nodeName&&"string"==typeof e.textContent&&"function"==typeof e.removeChild&&e.attributes instanceof C&&"function"==typeof e.removeAttribute&&"function"==typeof e.setAttribute)},Ne=function(e){return"object"===(void 0===N?"undefined":T(N))?e instanceof N:e&&"object"===(void 0===e?"undefined":T(e))&&"number"==typeof e.nodeType&&"string"==typeof e.nodeName},_e=function(e,t,n){G[e]&&G[e].forEach(function(e){e.call(S,t,n,xe)})},De=function(e){var t=void 0;if(_e("beforeSanitizeElements",e,null),Me(e))return we(e),!0;var n=e.nodeName.toLowerCase();if(_e("uponSanitizeElement",e,{tagName:n,allowedTags:Q}),!Q[n]||ne[n]){if(ge&&!be[n]&&"function"==typeof e.insertAdjacentHTML)try{e.insertAdjacentHTML("AfterEnd",e.innerHTML)}catch(e){}return we(e),!0}return!le||e.firstElementChild||e.content&&e.content.firstElementChild||!/</g.test(e.textContent)||(S.removed.push({element:e.cloneNode()}),e.innerHTML?e.innerHTML=e.innerHTML.replace(/</g,"&lt;"):e.innerHTML=e.textContent.replace(/</g,"&lt;")),se&&3===e.nodeType&&(t=(t=(t=e.textContent).replace(q," ")).replace(V," "),e.textContent!==t&&(S.removed.push({element:e.cloneNode()}),e.textContent=t)),_e("afterSanitizeElements",e,null),!1},Ce=function(e,t,n){if(he&&("id"===t||"name"===t)&&(n in E||n in Se))return!1;if(se&&(n=(n=n.replace(q," ")).replace(V," ")),ie&&Y.test(t));else if(oe&&K.test(t));else{if(!ee[t]||re[t])return!1;if(Ae[t]);else if(J.test(n.replace($,"")));else if("src"!==t&&"xlink:href"!==t||"script"===e||0!==n.indexOf("data:")||!Te[e]){if(ae&&!X.test(n.replace($,"")));else if(n)return!1}else;}return!0},Re=function(e){var t=void 0,n=void 0,r=void 0,o=void 0,i=void 0;_e("beforeSanitizeAttributes",e,null);var a=e.attributes;if(a){var l={attrName:"",attrValue:"",keepAttr:!0,allowedAttributes:ee};for(i=a.length;i--;){var s=t=a[i],c=s.name,d=s.namespaceURI;if(n=t.value.trim(),r=c.toLowerCase(),l.attrName=r,l.attrValue=n,l.keepAttr=!0,_e("uponSanitizeAttribute",e,l),n=l.attrValue,"name"===r&&"IMG"===e.nodeName&&a.id)o=a.id,a=Array.prototype.slice.apply(a),Le("id",e),Le(c,e),a.indexOf(o)>i&&e.setAttribute("id",o.value);else{if("INPUT"===e.nodeName&&"type"===r&&"file"===n&&(ee[r]||!re[r]))continue;"id"===c&&e.setAttribute(c,""),Le(c,e)}if(l.keepAttr){var u=e.nodeName.toLowerCase();if(Ce(u,r,n))try{d?e.setAttributeNS(d,c,n):e.setAttribute(c,n),S.removed.pop()}catch(e){}}}_e("afterSanitizeAttributes",e,null)}},Fe=function e(t){var n=void 0,r=Oe(t);for(_e("beforeSanitizeShadowDOM",t,null);n=r.nextNode();)_e("uponSanitizeShadowNode",n,null),De(n)||(n.content instanceof O&&e(n.content),Re(n));_e("afterSanitizeShadowDOM",t,null)};return S.sanitize=function(e,t){var n=void 0,r=void 0,o=void 0,i=void 0,a=void 0;if(e||(e="\x3c!--\x3e"),"string"!=typeof e&&!Ne(e)){if("function"!=typeof e.toString)throw new TypeError("toString is not a function");if("string"!=typeof(e=e.toString()))throw new TypeError("dirty is not a string, aborting")}if(!S.isSupported){if("object"===T(x.toStaticHTML)||"function"==typeof x.toStaticHTML){if("string"==typeof e)return x.toStaticHTML(e);if(Ne(e))return x.toStaticHTML(e.outerHTML)}return e}if(de||ke(t),S.removed=[],ye);else if(e instanceof N)1===(r=(n=Ee("\x3c!--\x3e")).ownerDocument.importNode(e,!0)).nodeType&&"BODY"===r.nodeName?n=r:n.appendChild(r);else{if(!me&&!ce&&-1===e.indexOf("<"))return e;if(!(n=Ee(e)))return me?null:""}n&&ue&&we(n.firstChild);for(var l=Oe(ye?e:n);o=l.nextNode();)3===o.nodeType&&o===i||De(o)||(o.content instanceof O&&Fe(o.content),Re(o),i=o);if(ye)return e;if(me){if(fe)for(a=W.call(n.ownerDocument);n.firstChild;)a.appendChild(n.firstChild);else a=n;return pe&&(a=B.call(k,a,!0)),a}return ce?n.outerHTML:n.innerHTML},S.setConfig=function(e){ke(e),de=!0},S.clearConfig=function(){xe=null,de=!1},S.isValidAttribute=function(e,t,n){xe||ke({});var r=e.toLowerCase(),o=t.toLowerCase();return Ce(r,o,n)},S.addHook=function(e,t){"function"==typeof t&&(G[e]=G[e]||[],G[e].push(t))},S.removeHook=function(e){G[e]&&G[e].pop()},S.removeHooks=function(e){G[e]&&(G[e]=[])},S.removeAllHooks=function(){G={}},S}var o=["a","abbr","acronym","address","area","article","aside","audio","b","bdi","bdo","big","blink","blockquote","body","br","button","canvas","caption","center","cite","code","col","colgroup","content","data","datalist","dd","decorator","del","details","dfn","dir","div","dl","dt","element","em","fieldset","figcaption","figure","font","footer","form","h1","h2","h3","h4","h5","h6","head","header","hgroup","hr","html","i","img","input","ins","kbd","label","legend","li","main","map","mark","marquee","menu","menuitem","meter","nav","nobr","ol","optgroup","option","output","p","pre","progress","q","rp","rt","ruby","s","samp","section","select","shadow","small","source","spacer","span","strike","strong","style","sub","summary","sup","table","tbody","td","template","textarea","tfoot","th","thead","time","tr","track","tt","u","ul","var","video","wbr"],i=["svg","a","altglyph","altglyphdef","altglyphitem","animatecolor","animatemotion","animatetransform","audio","canvas","circle","clippath","defs","desc","ellipse","filter","font","g","glyph","glyphref","hkern","image","line","lineargradient","marker","mask","metadata","mpath","path","pattern","polygon","polyline","radialgradient","rect","stop","style","switch","symbol","text","textpath","title","tref","tspan","video","view","vkern"],a=["feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence"],l=["math","menclose","merror","mfenced","mfrac","mglyph","mi","mlabeledtr","mmuliscripts","mn","mo","mover","mpadded","mphantom","mroot","mrow","ms","mpspace","msqrt","mystyle","msub","msup","msubsup","mtable","mtd","mtext","mtr","munder","munderover"],s=["#text"],c=["accept","action","align","alt","autocomplete","background","bgcolor","border","cellpadding","cellspacing","checked","cite","class","clear","color","cols","colspan","coords","crossorigin","datetime","default","dir","disabled","download","enctype","face","for","headers","height","hidden","high","href","hreflang","id","integrity","ismap","label","lang","list","loop","low","max","maxlength","media","method","min","multiple","name","noshade","novalidate","nowrap","open","optimum","pattern","placeholder","poster","preload","pubdate","radiogroup","readonly","rel","required","rev","reversed","role","rows","rowspan","spellcheck","scope","selected","shape","size","sizes","span","srclang","start","src","srcset","step","style","summary","tabindex","title","type","usemap","valign","value","width","xmlns"],d=["accent-height","accumulate","additivive","alignment-baseline","ascent","attributename","attributetype","azimuth","basefrequency","baseline-shift","begin","bias","by","class","clip","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","cx","cy","d","dx","dy","diffuseconstant","direction","display","divisor","dur","edgemode","elevation","end","fill","fill-opacity","fill-rule","filter","flood-color","flood-opacity","font-family","font-size","font-size-adjust","font-stretch","font-style","font-variant","font-weight","fx","fy","g1","g2","glyph-name","glyphref","gradientunits","gradienttransform","height","href","id","image-rendering","in","in2","k","k1","k2","k3","k4","kerning","keypoints","keysplines","keytimes","lang","lengthadjust","letter-spacing","kernelmatrix","kernelunitlength","lighting-color","local","marker-end","marker-mid","marker-start","markerheight","markerunits","markerwidth","maskcontentunits","maskunits","max","mask","media","method","mode","min","name","numoctaves","offset","operator","opacity","order","orient","orientation","origin","overflow","paint-order","path","pathlength","patterncontentunits","patterntransform","patternunits","points","preservealpha","preserveaspectratio","r","rx","ry","radius","refx","refy","repeatcount","repeatdur","restart","result","rotate","scale","seed","shape-rendering","specularconstant","specularexponent","spreadmethod","stddeviation","stitchtiles","stop-color","stop-opacity","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke","stroke-width","style","surfacescale","tabindex","targetx","targety","transform","text-anchor","text-decoration","text-rendering","textlength","type","u1","u2","unicode","values","viewbox","visibility","vert-adv-y","vert-origin-x","vert-origin-y","width","word-spacing","wrap","writing-mode","xchannelselector","ychannelselector","x","x1","x2","xmlns","y","y1","y2","z","zoomandpan"],u=["accent","accentunder","align","bevelled","close","columnsalign","columnlines","columnspan","denomalign","depth","dir","display","displaystyle","fence","frame","height","href","id","largeop","length","linethickness","lspace","lquote","mathbackground","mathcolor","mathsize","mathvariant","maxsize","minsize","movablelimits","notation","numalign","open","rowalign","rowlines","rowspacing","rowspan","rspace","rquote","scriptlevel","scriptminsize","scriptsizemultiplier","selection","separator","separators","stretchy","subscriptshift","supscriptshift","symmetric","voffset","width","xmlns"],m=["xlink:href","xml:id","xlink:title","xml:space","xmlns:xlink"],f=/\{\{[\s\S]*|[\s\S]*\}\}/gm,p=/<%[\s\S]*|[\s\S]*%>/gm,h=/^data-[\-\w.\u00B7-\uFFFF]/,g=/^aria-[\-\w]+$/,y=/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,v=/^(?:\w+script|data):/i,b=/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205f\u3000]/g,T="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},A=function(){return"undefined"==typeof window?null:window};return r()});
//# sourceMappingURL=purify.min.js.map

var $, _str;

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
    return $(el).bind('change.rivets', (function(_this) {
      return function() {
        var newVal, val;
        val = _this.model.get(_this.keypath) || [];
        newVal = el.checked ? _.uniq(val.concat(el.value)) : _.without(val, el.value);
        return _this.model.set(_this.keypath, newVal);
      };
    })(this));
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
    return $(el).bind('change.rivets', (function(_this) {
      return function() {
        if ($(el).hasClass('js_other_option')) {
          _this.model.set('value.other_checked', true);
          return _this.model.set(_this.keypath, []);
        } else {
          _this.model.unset('value.other_checked');
          _this.model.unset('value.other_text');
          return _this.model.set(_this.keypath, [el.value]);
        }
      };
    })(this));
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
    maybe_delete_jwt_token: function(xhr) {
      var _ref;
      if (((_ref = xhr.responseJSON) != null ? _ref.template : void 0) === 'Submission time has expired.') {
        return delete window.localStorage['jwtToken'];
      }
    },
    corsSupported: function() {
      return 'withCredentials' in new XMLHttpRequest();
    },
    projectUrl: function() {
      return "" + this.options.screendoorBase + "/projects/" + this.options.project_id;
    },
    authorizationHeader: function() {
      if (window.localStorage.jwtToken) {
        return {
          'Authorization': 'Bearer jwt_token=' + window.localStorage.jwtToken
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
    loadFromServer: function(cb) {
      if ((this.options.response_fields != null) && (this.options.response.responses != null)) {
        return cb();
      }
      return $.ajax({
        url: "" + this.options.screendoorBase + "/api/form_renderer/load",
        type: 'get',
        dataType: 'json',
        data: this.loadParams(),
        headers: _.extend(this.serverHeaders, this.authorizationHeader()),
        success: (function(_this) {
          return function(data, status, xhr) {
            var _base, _base1, _ref;
            if (xhr.getResponseHeader('jwt_token') != null) {
              window.localStorage.jwtToken = xhr.getResponseHeader('jwt_token');
            }
            (_base = _this.options).response_fields || (_base.response_fields = data.project.response_fields);
            (_base1 = _this.options.response).responses || (_base1.responses = ((_ref = data.response) != null ? _ref.responses : void 0) || {});
            if (_this.options.afterSubmit == null) {
              _this.options.afterSubmit = {
                method: 'page',
                html: data.project.after_response_page_html || ("<p>" + FormRenderer.t.thanks + "</p>")
              };
            }
            cb();
            if (document.location.search.match(/respondent_auth_token/)) {
              return document.location.search = _this.tokenlessQueryParams(document.location.search);
            }
          };
        })(this),
        error: (function(_this) {
          return function(xhr) {
            var _ref, _ref1, _ref2, _ref3, _ref4;
            if (!_this.corsSupported()) {
              return _this.$el.find('.fr_loading').html(FormRenderer.t.not_supported.replace(/\:url/g, _this.projectUrl()));
            } else if (((_ref = xhr.responseJSON) != null ? _ref.error : void 0) === 'Token expired. Verify identity.') {
              _this.$el.html(JST["partials/verify"]({
                'template': (_ref1 = xhr.responseJSON) != null ? _ref1.template : void 0,
                'href': (_ref2 = xhr.responseJSON) != null ? _ref2.verify_api_endpoint : void 0,
                'button': (_ref3 = xhr.responseJSON) != null ? _ref3.verify_email_button : void 0
              }));
              return _this.maybe_delete_jwt_token(xhr);
            } else {
              _this.$el.find('.fr_loading').text("" + FormRenderer.t.error_loading + ": \"" + (((_ref4 = xhr.responseJSON) != null ? _ref4.error : void 0) || 'Unknown') + "\"");
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
    queryParams: function() {
      return FormRenderer.queryParams(document.location.search);
    },
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
        headers: _.extend(this.serverHeaders, this.authorizationHeader()),
        complete: (function(_this) {
          return function() {
            _this.requests -= 1;
            _this.isSaving = false;
            return _this.trigger('afterSave');
          };
        })(this),
        success: (function(_this) {
          return function(data, state, xhr) {
            var _ref;
            if (xhr.getResponseHeader('jwt_token') != null) {
              window.localStorage.jwtToken = xhr.getResponseHeader('jwt_token');
            }
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
            var _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
            _this.state.set({
              hasServerErrors: true,
              serverErrorText: (_ref = xhr.responseJSON) != null ? _ref.error : void 0,
              serverErrorKey: (_ref1 = xhr.responseJSON) != null ? _ref1.error_key : void 0,
              submitting: false
            });
            if (((_ref2 = xhr.responseJSON) != null ? _ref2.error : void 0) === 'Token expired. Verify identity.') {
              _this.$el.html(JST["partials/verify"]({
                'template': (_ref3 = xhr.responseJSON) != null ? _ref3.template : void 0,
                'href': (_ref4 = xhr.responseJSON) != null ? _ref4.verify_api_endpoint : void 0,
                'button': (_ref5 = xhr.responseJSON) != null ? _ref5.verify_email_button : void 0
              }));
              return _this.maybe_delete_jwt_token(xhr);
            }
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

  FormRenderer.REMOVE_ENTRY_LINK_CLASS = 'fr_group_entry_remove';

  FormRenderer.REMOVE_ENTRY_LINK_HTML = 'Remove';

  FormRenderer.Views = {};

  FormRenderer.Models = {};

  FormRenderer.Plugins = {};

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

  FormRenderer.formComponentModelClass = function(field) {
    return FormRenderer.Models["ResponseField" + (_str.classify(field.field_type))];
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
    pattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
    return str.replace(pattern, "$1<a href='$2' target='_blank'>$2</a>");
  };

  simpleFormat = function(str) {
    if (str == null) {
      str = '';
    }
    return ("" + str).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br />' + '$2');
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
  FormRenderer.VERSION = '1.3.16';

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
      var _ref, _ref1, _ref2, _ref3;
      if ((_ref = this.responseField) != null ? (_ref1 = _ref.fr) != null ? (_ref2 = _ref1.options) != null ? _ref2.skipConditions : void 0 : void 0 : void 0) {
        return true;
      }
      if (!this.isValid()) {
        return true;
      }
      if (_ref3 = this.condition.method, __indexOf.call(presenceMethods, _ref3) >= 0) {
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
      return this.calculateVisibility();
    },
    sync: function() {},
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
        return true;
      }
      return this.satisfiesConditions(this.parent.formComponents);
    },
    satisfiesConditions: function(formComponents) {
      if (!this.isConditional()) {
        return true;
      }
      return _[this.conditionMethod()](this.getConditions(), (function(_this) {
        return function(conditionHash) {
          var conditionChecker;
          conditionChecker = new FormRenderer.ConditionChecker(formComponents.get(conditionHash.response_field_id), conditionHash);
          return conditionChecker.isVisible();
        };
      })(this));
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
      this._sharedInitialize(options);
      this.listenTo(this.model, 'afterValidate', this.render);
      this.listenTo(this.model, 'change', this._onInput);
      this.listenTo(this.model, 'change:currentLength', this.auditLength);
      this.listenTo(this.model, 'change:error', this.toggleErrorModifier);
      return this.$el.addClass("fr_response_field_" + this.model.field_type);
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
                  return _this.model.validateComponent();
                });
              } else {
                return _this.model.validateComponent();
              }
            }
          };
        })(this), 1);
      }
    },
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
      var entry, _i, _len, _ref, _results;
      _ref = this.entries;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entry = _ref[_i];
        _results.push(entry.formComponents.invoke('validateComponent'));
      }
      return _results;
    },
    setExistingValue: function(entryValues) {
      if (this.isRequired()) {
        if (!entryValues || entryValues.length === 0) {
          entryValues = [{}];
        }
      } else {
        if (!entryValues) {
          entryValues = [{}];
        } else if (_.isArray(entryValues) && _.isEmpty(entryValues)) {
          this.set('skipped', true);
        }
      }
      return this.entries = _.map(entryValues, (function(_this) {
        return function(value) {
          return new FormRenderer.Models.ResponseFieldRepeatingGroupEntry({
            value: value
          }, _this.fr, _this);
        };
      })(this));
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
        return parseInt(this.get('maxentries'), 10) || Infinity;
      } else {
        return Infinity;
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
      this.on('shown', (function(_this) {
        return function() {
          var view, _i, _len, _ref, _results;
          _ref = _this.views;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            view = _ref[_i];
            _results.push(view.trigger('shown'));
          }
          return _results;
        };
      })(this));
      return this.on('hidden', (function(_this) {
        return function() {
          var view, _i, _len, _ref, _results;
          _ref = _this.views;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            view = _ref[_i];
            _results.push(view.trigger('hidden'));
          }
          return _results;
        };
      })(this));
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
      var $els, entry, idx, view, _i, _len, _ref, _ref1;
      this.views = [];
      $els = $();
      _ref = this.model.entries || [];
      for (idx = _i = 0, _len = _ref.length; _i < _len; idx = ++_i) {
        entry = _ref[idx];
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
      rivets.bind(this.$el, {
        model: this.model
      });
      this.$el.find('.fr_group_entries').append($els);
      if ((_ref1 = this.form_renderer) != null) {
        _ref1.trigger('viewRendered', this);
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
      this.on('shown', (function(_this) {
        return function() {
          var view, _i, _len, _ref, _results;
          _ref = _this.views;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            view = _ref[_i];
            _results.push(view.trigger('shown'));
          }
          return _results;
        };
      })(this));
      return this.on('hidden', (function(_this) {
        return function() {
          var view, _i, _len, _ref, _results;
          _ref = _this.views;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            view = _ref[_i];
            _results.push(view.trigger('hidden'));
          }
          return _results;
        };
      })(this));
    },
    render: function() {
      var $children, _ref;
      this.$el.html(JST['partials/repeating_group_entry'](this));
      if ((_ref = this.form_renderer) != null) {
        _ref.trigger('viewRendered', this);
      }
      $children = this.$el.find('.fr_group_entry_fields');
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
      return this.get('value') || false;
    },
    setExistingValue: function(x) {
      if (x != null) {
        return this.set('value', x);
      }
    },
    toText: function() {
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
          return "." + x;
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
      this.$label.on('click', function(e) {
        if ($(this).hasClass('disabled')) {
          return e.preventDefault();
        }
      });
      this.$input.on('focus', (function(_this) {
        return function() {
          return _this.$label.addClass('highlight');
        };
      })(this));
      this.$input.on('blur', (function(_this) {
        return function() {
          return _this.$label.removeClass('highlight');
        };
      })(this));
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
    },
    shouldPersistValue: function() {
      var _ref;
      if ((_ref = this.fr) != null ? _ref.isRenderingFollowUpForm() : void 0) {
        return false;
      } else {
        return FormRenderer.Models.ResponseField.prototype.shouldPersistValue.apply(this, arguments);
      }
    },
    getValue: function() {
      var _ref;
      if ((_ref = this.fr) != null ? _ref.isRenderingFollowUpForm() : void 0) {
        return null;
      } else {
        return FormRenderer.Models.ResponseField.prototype.getValue.apply(this, arguments);
      }
    }
  });

  FormRenderer.Views.ResponseFieldIdentification = FormRenderer.Views.ResponseField.extend({
    field_type: 'identification',
    disableInput: function() {
      return this.isInputDisabled = true;
    },
    dontRenderInputs: function() {
      var _ref;
      return !!this.isInputDisabled || ((_ref = this.form_renderer) != null ? _ref.isRenderingFollowUpForm() : void 0);
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
        values.push(("" + (this.get('value.dollars'))).replace(/,/g, '').replace(/^\$/, ''));
      }
      if (this.get('value.cents')) {
        values.push("" + (this.get('value.cents')));
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
        return parseInt(this.get('maxrows'), 10) || Infinity;
      } else {
        return Infinity;
      }
    },
    setExistingValue: function(x) {
      var existingNumRows, _ref;
      existingNumRows = Math.max(this.minRows(), ((_ref = _.values(x)[0]) != null ? _ref.length : void 0) || 0, 1);
      return this.set('value', _.tap([], (function(_this) {
        return function(arr) {
          var colArr, column, _i, _j, _len, _ref1, _ref2, _results, _results1;
          _ref1 = _this.getColumns();
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            column = _ref1[_i];
            colArr = _.map((function() {
              _results1 = [];
              for (var _j = 0, _ref2 = existingNumRows - 1; 0 <= _ref2 ? _j <= _ref2 : _j >= _ref2; 0 <= _ref2 ? _j++ : _j--){ _results1.push(_j); }
              return _results1;
            }).apply(this), function(i) {
              var _ref3;
              return _this.getPresetValue(column.label, i) || (x != null ? (_ref3 = x[column.label]) != null ? _ref3[i] : void 0 : void 0);
            });
            _results.push(arr.push(colArr));
          }
          return _results;
        };
      })(this)));
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
              for (i = _j = 0, _ref1 = this.numRows() - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
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
        for (i = _j = 0, _ref1 = this.numRows() - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
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
      var col, newVal, vals, _ref;
      e.preventDefault();
      newVal = {};
      _ref = this.model.get('value');
      for (col in _ref) {
        vals = _ref[col];
        newVal[col] = vals.concat('');
      }
      this.model.set('value', newVal);
      return this.render();
    },
    removeRow: function(e) {
      var col, idx, newVal, vals, _ref;
      e.preventDefault();
      idx = $(e.currentTarget).closest('[data-row-index]').data('row-index');
      newVal = {};
      _ref = this.model.get('value');
      for (col in _ref) {
        vals = _ref[col];
        newVal[col] = _.tap([], function(arr) {
          var i, val, _results;
          _results = [];
          for (i in vals) {
            val = vals[i];
            if (parseInt(i, 10) !== idx) {
              _results.push(arr.push(val));
            } else {
              _results.push(void 0);
            }
          }
          return _results;
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
      return "" + (this.getValue().hours || '00') + ":" + (this.getValue().minutes || '00') + ":" + (this.getValue().seconds || '00') + " " + (this.getValue().am_pm);
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
    validateComponent: function(opts) {
      var errorIs, errorKey, errorWas, validationFn, _i, _len, _ref;
      if (opts == null) {
        opts = {};
      }
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
  var FieldView;

  FieldView = {
    _sharedInitialize: function(options) {
      this.form_renderer = options.form_renderer, this.model = options.model;
      if (this.model.id) {
        this.$el.addClass("fr_response_field_" + this.model.id);
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
    getDomId: function() {
      return domId;
    }
  };

  _.extend(FormRenderer.Views.ResponseFieldRepeatingGroup.prototype, FieldView);

  _.extend(FormRenderer.Views.ResponseField.prototype, FieldView);

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
      var field, model, _i, _len;
      this.formComponents = new Backbone.Collection;
      this.response_fields = this.formComponents;
      for (_i = 0, _len = fieldData.length; _i < _len; _i++) {
        field = fieldData[_i];
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
        return ("" + condition.response_field_id) === ("" + rf.id);
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
      var cookieKey, draftKey, _base;
      draftKey = "project-" + this.fr.options.project_id + "-response-id";
      if (this.fr.options.response.id == null) {
        cookieKey = Cookies.get(draftKey);
      }
      if (cookieKey != null) {
        if (cookieKey.indexOf(',') !== -1) {
          (_base = this.fr.options.response).id || (_base.id = cookieKey);
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
      var component, _i, _len, _ref, _results;
      _ref = this.models;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        component = _ref[_i];
        _results.push(component.validateComponent());
      }
      return _results;
    },
    fieldViews: function() {
      return _.tap([], (function(_this) {
        return function(arr) {
          var entry, fieldView, view, _i, _len, _ref, _results;
          _ref = _this.views;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            view = _ref[_i];
            if (view.model.group) {
              if (!view.model.isSkipped()) {
                _results.push((function() {
                  var _j, _len1, _ref1, _results1;
                  _ref1 = view.model.entries;
                  _results1 = [];
                  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    entry = _ref1[_j];
                    _results1.push((function() {
                      var _k, _len2, _ref2, _results2;
                      _ref2 = entry.view.views;
                      _results2 = [];
                      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                        fieldView = _ref2[_k];
                        _results2.push(arr.push(fieldView));
                      }
                      return _results2;
                    })());
                  }
                  return _results1;
                })());
              } else {
                _results.push(void 0);
              }
            } else {
              _results.push(arr.push(view));
            }
          }
          return _results;
        };
      })(this));
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
var FormRendererEN = {"address":"Address","add_another":"Add another","answer":"Answer this question","back_to_page":"Back to page :num","blind":"Blind","bookmark_hint":"To finish your response later, copy the link below.","cents":"Cents","characters":"characters","choose_an_option":"Choose an option","city":"City","clear":"Clear","click_to_set":"Click to set location","coordinates":"Coordinates","country":"Country","dollars":"Dollars","email":"Email","enter_at_least":"Enter at least :min","enter_between":"Enter between :min and :max","enter_exactly":"Enter :num","enter_up_to":"Enter up to :max","error":"Error","errors":{"blank":"This field can't be blank.","date":"Please enter a valid date.","email":"Please enter a valid email address.","identification":"Please enter your name and email address.","integer":"Please enter a whole number.","large":"Your answer is too large.","long":"Your answer is too long.","number":"Please enter a valid number.","phone":"Please enter a valid phone number.","price":"Please enter a valid price.","short":"Your answer is too short.","small":"Your answer is too small.","time":"Please enter a valid time.","us_phone":"Please enter a valid 10-digit phone number."},"error_bar":{"errors":"Your response has <a href='#'>validation errors</a>."},"error_filename":"Error reading filename","error_loading":"Error loading form","error_saving":"Error saving","finishing_up":"Finishing up...","finish_later":"Finish this later","has_conditions":"Has conditions","hidden":"Hidden","loading_form":"Loading form...","na":"N/A","name":"Name","next_page":"Next page","not_supported":"Sorry, your browser does not support this embedded form. Please visit <a href=':url?fr_not_supported=t'>:url</a> to fill out this form.","other":"Other","postal_code":"Postal Code","province":"Province","remove":"Remove","saved":"Saved","saving":"Saving...","skip":"Skip this question","skipped":"This question is skipped.","state":"State","state_province_region":"State / Province / Region","submit":"Submit","submitting":"Submitting","thanks":"Thanks for submitting our form!","upload":"Upload a file","uploading":"Uploading...","upload_another":"Upload another file","we_accept":"We'll accept","words":"words","write_here":"Write your answer here","zip_code":"ZIP Code"};
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
      var format, i, j, len, len1, ref, ref1, ref2, x;
    
      format = this.model.get('address_format');
    
      _print(_safe('\n\n'));
    
      if (format !== 'city_state' && format !== 'city_state_zip' && format !== 'country') {
        _print(_safe('\n  <div class=\'fr_grid\'>\n    <div class=\'fr_full has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.domId());
        _print(_safe('_street\'>'));
        _print(FormRenderer.t.address);
        _print(_safe('</label>\n      <input type="text"\n             id="'));
        _print(this.domId());
        _print(_safe('_street"\n             data-rv-input=\'model.value.street\' />\n    </div>\n  </div>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (format !== 'country') {
        _print(_safe('\n  <div class=\'fr_grid\'>\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.domId());
        _print(_safe('_city\'>'));
        _print(FormRenderer.t.city);
        _print(_safe('</label>\n      <input type="text"\n             data-rv-input=\'model.value.city\'\n             id=\''));
        _print(this.domId());
        _print(_safe('_city\' />\n    </div>\n\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.domId());
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
        if ((ref = this.model.get('value.country')) === 'US' || ref === 'CA') {
          _print(_safe('\n        <select data-rv-value=\'model.value.state\' data-width=\'100%\' id=\''));
          _print(this.domId());
          _print(_safe('_state\'>\n          <option></option>\n          '));
          ref1 = FormRenderer["PROVINCES_" + (this.model.get('value.country'))];
          for (i = 0, len = ref1.length; i < len; i++) {
            x = ref1[i];
            _print(_safe('\n            <option value=\''));
            _print(x);
            _print(_safe('\'>'));
            _print(x);
            _print(_safe('</option>\n          '));
          }
          _print(_safe('\n        </select>\n      '));
        } else {
          _print(_safe('\n        <input type="text" data-rv-input=\'model.value.state\' id=\''));
          _print(this.domId());
          _print(_safe('_state\' />\n      '));
        }
        _print(_safe('\n    </div>\n  </div>\n'));
      }
    
      _print(_safe('\n\n<div class=\'fr_grid\'>\n  '));
    
      if (format !== 'city_state' && format !== 'country') {
        _print(_safe('\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.domId());
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
        _print(this.domId());
        _print(_safe('_zipcode\' />\n    </div>\n  '));
      }
    
      _print(_safe('\n\n  '));
    
      if (format !== 'city_state' && format !== 'city_state_zip') {
        _print(_safe('\n    <div class=\'fr_half has_sub_label\'>\n      <label class="fr_sub_label" for=\''));
        _print(this.domId());
        _print(_safe('_country\'>'));
        _print(FormRenderer.t.country);
        _print(_safe('</label>\n      <select data-rv-value=\'model.value.country\' data-width=\'100%\' id=\''));
        _print(this.domId());
        _print(_safe('_country\'>\n        '));
        ref2 = FormRenderer.ORDERED_COUNTRIES;
        for (j = 0, len1 = ref2.length; j < len1; j++) {
          x = ref2[j];
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
    
      _print(this.safe(FormRenderer.formatAndSanitizeHTML(this.model.get('description'))));
    
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
      var i, len, option, ref;
    
      ref = this.model.getOptions();
      for (i = 0, len = ref.length; i < len; i++) {
        option = ref[i];
        _print(_safe('\n  <label class=\'fr_option control\'>\n    <input type=\'checkbox\' data-rv-checkedarray=\'model.value.checked\' value="'));
        _print(option.label);
        _print(_safe('" />\n    '));
        _print(option.translated_label || option.label);
        _print(_safe('\n  </label>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (this.model.get('include_other_option')) {
        _print(_safe('\n  <div class=\'fr_option fr_other_option\'>\n    <label class=\'control\'>\n      <input type=\'checkbox\' data-rv-checked=\'model.value.other_checked\' />\n      '));
        _print(FormRenderer.t.other);
        _print(_safe('\n    </label>\n\n    <input type=\'text\'\n           data-rv-show=\'model.value.other_checked\'\n           data-rv-input=\'model.value.other_text\'\n           placeholder=\''));
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
    
      _print(this.domId());
    
      _print(_safe('_month">MM</label>\n    <input type="text"\n           id="'));
    
      _print(this.domId());
    
      _print(_safe('_month"\n           data-rv-input=\'model.value.month\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_spacer\'>/</div>\n\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="'));
    
      _print(this.domId());
    
      _print(_safe('_day">DD</label>\n    <input type="text"\n           data-rv-input=\'model.value.day\'\n           maxlength=\'2\'\n           size=\'2\'\n           id="'));
    
      _print(this.domId());
    
      _print(_safe('_day" />\n  </div>\n\n  '));
    
      if (!this.model.get('disable_year')) {
        _print(_safe('\n    <div class=\'fr_spacer\'>/</div>\n\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="'));
        _print(this.domId());
        _print(_safe('_year">YYYY</label>\n      <input type="text"\n             data-rv-input=\'model.value.year\'\n             maxlength=\'4\'\n             size=\'4\'\n             id="'));
        _print(this.domId());
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
      var i, len, option, ref;
    
      _print(_safe('<select id="'));
    
      _print(this.domId());
    
      _print(_safe('" data-rv-value=\'model.value\'>\n  '));
    
      if (this.model.get('include_blank_option')) {
        _print(_safe('\n    <option selected value="">\n      '));
        _print(FormRenderer.t.choose_an_option);
        _print(_safe('\n    </option>\n  '));
      }
    
      _print(_safe('\n\n  '));
    
      ref = this.model.getOptions();
      for (i = 0, len = ref.length; i < len; i++) {
        option = ref[i];
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
    
      _print(this.domId());
    
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
      var attachment, exts, i, len, ref;
    
      _print(_safe('<div class=\'fr_files\'>\n  '));
    
      ref = this.model.getFiles();
      for (i = 0, len = ref.length; i < len; i++) {
        attachment = ref[i];
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
        _print(this.domId());
        _print(_safe('\' class=\''));
        _print(FormRenderer.BUTTON_CLASS);
        _print(_safe('\'>\n      '));
        _print(this.model.getFiles().length ? FormRenderer.t.upload_another : FormRenderer.t.upload);
        _print(_safe('\n    </label>\n\n    <input type=\'file\'\n           id=\''));
        _print(this.domId());
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
    
      _print(this.domId());
    
      _print(_safe('-name\'>\n      '));
    
      _print(FormRenderer.t.name);
    
      _print(_safe('\n\n      '));
    
      if (!this.dontRenderInputs()) {
        _print(_safe('\n        <abbr class=\'fr_required\' title=\'required\'>*</abbr>\n      '));
      }
    
      _print(_safe('\n    </label>\n\n    '));
    
      if (this.dontRenderInputs()) {
        _print(_safe('\n      <span>'));
        _print(this.model.get('value.name'));
        _print(_safe('</span>\n    '));
      } else {
        _print(_safe('\n      <input type=\'text\'\n             id=\''));
        _print(this.domId());
        _print(_safe('-name\'\n             data-rv-input=\'model.value.name\' />\n    '));
      }
    
      _print(_safe('\n  </div>\n\n  <div class=\'fr_half\'>\n    <label for=\''));
    
      _print(this.domId());
    
      _print(_safe('-email\'>\n      '));
    
      _print(FormRenderer.t.email);
    
      _print(_safe('\n      '));
    
      if (!this.dontRenderInputs()) {
        _print(_safe('\n        <abbr class=\'fr_required\' title=\'required\'>*</abbr>\n      '));
      }
    
      _print(_safe('\n    </label>\n\n    '));
    
      if (this.dontRenderInputs()) {
        _print(_safe('\n      <span>'));
        _print(this.model.get('value.email'));
        _print(_safe('</span>\n    '));
      } else {
        _print(_safe('\n      <input type="text"\n             id=\''));
        _print(this.domId());
        _print(_safe('-email\'\n             data-rv-input=\'model.value.email\' />\n    '));
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
    
      _print(this.domId());
    
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
    
      _print(this.domId());
    
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
    
      _print(this.domId());
    
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
    
      _print(this.domId());
    
      _print(_safe('_dollars">'));
    
      _print(FormRenderer.t.dollars);
    
      _print(_safe('</label>\n    <input type="text"\n           id="'));
    
      _print(this.domId());
    
      _print(_safe('_dollars"\n           data-rv-input=\'model.value.dollars\'\n           size=\'6\' />\n  </div>\n\n  '));
    
      if (!this.model.get('disable_cents')) {
        _print(_safe('\n    <div class=\'fr_spacer\'>.</div>\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="'));
        _print(this.domId());
        _print(_safe('_cents">'));
        _print(FormRenderer.t.cents);
        _print(_safe('</label>\n      <input type="text"\n             data-rv-input=\'model.value.cents\'\n             maxlength=\'2\'\n             size=\'2\'\n             id="'));
        _print(this.domId());
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
      var i, len, option, ref;
    
      ref = this.model.getOptions();
      for (i = 0, len = ref.length; i < len; i++) {
        option = ref[i];
        _print(_safe('\n  <label class=\'fr_option control\'>\n    <input type=\'radio\'\n           data-rv-dobtradiogroup=\'model.value.checked\'\n           value="'));
        _print(option.label);
        _print(_safe('"\n    />\n    '));
        _print(option.translated_label || option.label);
        _print(_safe('\n  </label>\n'));
      }
    
      _print(_safe('\n\n'));
    
      if (this.model.get('include_other_option')) {
        _print(_safe('\n  <div class=\'fr_option fr_other_option\'>\n    <label class=\'control\'>\n      <input type=\'radio\'\n             data-rv-dobtradiogroup=\'model.value.checked\'\n             class="js_other_option"\n      />\n      '));
        _print(FormRenderer.t.other);
        _print(_safe('\n    </label>\n\n    <input type=\'text\'\n           data-rv-show=\'model.value.other_checked\'\n           data-rv-input=\'model.value.other_text\'\n           placeholder=\''));
        _print(FormRenderer.t.write_here);
        _print(_safe('\'\n    />\n  </div>\n'));
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
      var formattedDescription;
    
      _print(_safe(JST["partials/labels"](this)));
    
      _print(_safe('\n\n'));
    
      formattedDescription = FormRenderer.formatAndSanitizeHTML(this.model.get('description'));
    
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
        _print(this.safe(formattedDescription));
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
      var column, i, j, k, l, len, len1, len2, m, n, ref, ref1, ref2, ref3;
    
      _print(_safe('<table class=\'fr_table\'>\n  <thead>\n    <tr>\n      '));
    
      ref = this.model.getColumns();
      for (k = 0, len = ref.length; k < len; k++) {
        column = ref[k];
        _print(_safe('\n        <th>'));
        _print(column.translated_label || column.label);
        _print(_safe('</th>\n      '));
      }
    
      _print(_safe('\n\n      <th class=\'fr_table_col_remove\'></th>\n    </tr>\n  </thead>\n\n  <tbody>\n    '));
    
      for (i = l = 0, ref1 = this.model.numRows() - 1; 0 <= ref1 ? l <= ref1 : l >= ref1; i = 0 <= ref1 ? ++l : --l) {
        _print(_safe('\n      <tr data-row-index="'));
        _print(i);
        _print(_safe('">\n        '));
        ref2 = this.model.getColumns();
        for (j = m = 0, len1 = ref2.length; m < len1; j = ++m) {
          column = ref2[j];
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
              _print(this.domId());
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
        ref3 = this.model.getColumns();
        for (j = n = 0, len2 = ref3.length; n < len2; j = ++n) {
          column = ref3[j];
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
        _print(FormRenderer.t.add_another);
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
    
      _print(this.domId());
    
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
    
      _print(this.domId());
    
      _print(_safe('_hours">HH</label>\n    <input type="text"\n           id="'));
    
      _print(this.domId());
    
      _print(_safe('_hours"\n           data-rv-input=\'model.value.hours\'\n           maxlength=\'2\'\n           size=\'2\' />\n  </div>\n\n  <div class=\'fr_spacer\'>:</div>\n\n  <div class=\'has_sub_label\'>\n    <label class="fr_sub_label" for="'));
    
      _print(this.domId());
    
      _print(_safe('_minutes">MM</label>\n    <input type="text"\n           data-rv-input=\'model.value.minutes\'\n           maxlength=\'2\'\n           size=\'2\'\n           id="'));
    
      _print(this.domId());
    
      _print(_safe('_minutes" />\n  </div>\n\n  '));
    
      if (!this.model.get('disable_seconds')) {
        _print(_safe('\n    <div class=\'fr_spacer\'>:</div>\n\n    <div class=\'has_sub_label\'>\n      <label class="fr_sub_label" for="'));
        _print(this.domId());
        _print(_safe('_seconds">SS</label>\n      <input type="text"\n             data-rv-input=\'model.value.seconds\'\n             maxlength=\'2\'\n             size=\'2\'\n             id="'));
        _print(this.domId());
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
    
      _print(this.domId());
    
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
        _print(this.safe(FormRenderer.formatAndSanitizeHTML(this.model.get('description'))));
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
window.JST["partials/email_sent"] = function(__obj) {
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
      _print(_safe('<p>'));
    
      _print(this.message);
    
      _print(_safe('</p>\n\n'));
    
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
    
      if (this.model.group || this.model.wrapper === 'fieldset') {
        _print(_safe('aria-hidden="true"'));
      } else {
        _print(_safe('for="'));
        _print(this.domId());
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
        if (this.model.get('admin_only')) {
          _print(_safe('\n    <span class=\'label label_fb\'><i class=\'fa fa-lock\'></i>'));
          _print(FormRenderer.t.hidden);
          _print(_safe('</span>\n  '));
        }
        _print(_safe('\n  '));
        if (this.model.get('blind')) {
          _print(_safe('\n    <span class=\'label label_fb\'><i class=\'fa fa-eye-slash\'></i> '));
          _print(FormRenderer.t.blind);
          _print(_safe('</span>\n  '));
        }
        _print(_safe('\n  '));
        if (this.model.isConditional()) {
          _print(_safe('\n    <span class=\'label label_fb\'><i class=\'fa fa-code-fork\'></i>'));
          _print(FormRenderer.t.has_conditions);
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
      var i, idx, j, len, ref;
    
      if (this.form_renderer.visiblePages().length > 1) {
        _print(_safe('\n  <ul class=\'fr_pagination\'>\n    '));
        ref = this.form_renderer.visiblePages();
        for (idx = j = 0, len = ref.length; j < len; idx = ++j) {
          i = ref[idx];
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
      _print(_safe('<fieldset class=\'fr_fieldset\'>\n  <legend>'));
    
      _print(this.model.get('label'));
    
      _print(_safe('</legend>\n\n  '));
    
      _print(_safe(JST["partials/label"](this)));
    
      _print(_safe('\n\n  <div class="fr_description">\n    '));
    
      if (this.model.renderingRespondentForm()) {
        _print(_safe('\n      '));
        _print(this.model.get('description'));
        _print(_safe('\n    '));
      } else {
        _print(_safe('\n      '));
        _print(this.model.getTruncatedDescription());
        _print(_safe('\n    '));
      }
    
      _print(_safe('\n  </div>\n\n  '));
    
      if (this.model.isSkipped()) {
        _print(_safe('\n    <a href=\'#\' class=\'js-skip fr_group_answer\'>'));
        _print(FormRenderer.t.answer);
        _print(_safe('</a>\n    <div class=\'fr_group_skipped\' style=\'clear: both\'>'));
        _print(FormRenderer.t.skipped);
        _print(_safe('</div>\n  '));
      } else {
        _print(_safe('\n    '));
        if (!this.model.isRequired()) {
          _print(_safe('\n      <a href=\'#\' class=\'js-skip fr_group_skip\'>'));
          _print(FormRenderer.t.skip);
          _print(_safe('</a>\n    '));
        }
        _print(_safe('\n\n    <div class=\'fr_group_entries\'>\n    </div>\n\n    '));
        if (this.model.canAdd()) {
          _print(_safe('\n      <a href=\'#\' class=\'js-add-entry '));
          _print(FormRenderer.BUTTON_CLASS);
          _print(_safe('\'>'));
          _print(FormRenderer.t.add_another);
          _print(_safe('</a>\n    '));
        }
        _print(_safe('\n  '));
      }
    
      _print(_safe('\n</fieldset>\n'));
    
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
      _print(_safe('<div class=\'fr_group_entry_idx\'><span>'));
    
      _print(this.idx + 1);
    
      _print(_safe('</span></div>\n\n<div class=\'fr_group_entry_fields\'>\n</div>\n\n'));
    
      if (this.entry.canRemove()) {
        _print(_safe('\n  <a href=\'#\' class=\'js-remove-entry '));
        _print(_safe(FormRenderer.REMOVE_ENTRY_LINK_CLASS));
        _print(_safe('\'>'));
        _print(_safe(FormRenderer.REMOVE_ENTRY_LINK_HTML));
        _print(_safe('</a>\n'));
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
window.JST["partials/verify"] = function(__obj) {
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
      _print(_safe('<div class=\'fr_loading\'>\n  <p>'));
    
      _print(this.safe(this.template));
    
      _print(_safe('</p>\n  '));
    
      if (this.href != null) {
        _print(_safe('\n    <div>\n      <button id=\'screendoor-verify-identity\' href=\'#\' data-href=\''));
        _print(this.href);
        _print(_safe('\'>'));
        _print(this.button);
        _print(_safe('</button>\n    </div>\n  '));
      }
    
      _print(_safe('\n</div>\n\n'));
    
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
      var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };
    
      _print(_safe('<div class=\'fr_bottom\'>\n  '));
    
      if (indexOf.call(this.form_renderer.options.plugins, 'Autosave') >= 0) {
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