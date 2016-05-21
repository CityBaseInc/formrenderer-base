formrenderer-base [![status]](https://circleci.com/gh/dobtco/formrenderer-base/tree/master) ![bower]
=================

formrenderer-base is a JavaScript library for rendering an HTML form from a JSON definition, and persisting form submissions back to a server via AJAX. This is the library used for rendering forms inside of [Screendoor](https://www.dobt.co/screendoor), and as such, it's pretty tightly coupled to Screendoor's server API. There's a couple different ways this library can be used:

## Ways to use it

1. **Embedding a Screendoor form on your website.** This is the primary supported use of this library.
2. **Rendering forms without Screendoor.** You could use [formbuilder](https://github.com/dobtco/formbuilder) to let your users build forms, and then render them with this library. You'll have to override all save-related functionality that talks to Screendoor by default.

This documentation will be focused on the former, while the latter should be considered unsupported.

## Getting started

Include the formrenderer JS and CSS:

```html
<script src='//d3q1ytufopwvkq.cloudfront.net/0/formrenderer.js'></script>
<link href='//d3q1ytufopwvkq.cloudfront.net/0/formrenderer.css' rel='stylesheet' />
```

> **Note:** This file will automatically update with each new release of formrenderer. If you're going to customize anything, you should consider replacing "/0/" with a specific version number. (You can find the current version number in a badge at the top of this file.)

These files contain all of the necessary dependencies **with the exception of jQuery**, which must be loaded before `formrenderer.js`.

Once you're ready to render a form:

```html
<form data-formrenderer></form>

<script>
  new FormRenderer({
    "project_id": "w90Xe5IM5IlP7FqU", // Your project's embed token
  });
</script>
```

## Styling the form

Because formrenderer is implemented in JavaScript, without the use of iframes, your embedded form should adopt the look-and-feel of your website. However, some users may wish to customize or tweak the appearance of their form. We recommend starting with the following:

1. After instantiating the form with `new FormRenderer(...)`, set the variable `FormRenderer.BUTTON_CLASS` to the CSS class that your website uses for buttons. (For example, if you're using Bootstrap, you would write `FormRenderer.BUTTON_CLASS = 'btn btn-primary'`.)
2. Override formrenderer's default CSS by using your browser's "inspect element" feature to view the CSS class names, or by discovering them in [main.scss](https://github.com/dobtco/formrenderer-base/blob/master/dist/styles/main.scss).

## Customization options

| option | description | default |
| --- | --- | --- |
| project_id | Your Screendoor project's embed token, which can be found on your embed code page. |  |
| onReady | A function to call once the form is fully-loaded |  |
| target | jQuery selector for the element in which to render your form. Can also be a DOM node. | `'[data-formrenderer]'` |
| enablePages | If the form contains multiple pages, render them. Set to `false` to render all response fields on the same page. | `true` |
| validateImmediately | If the form is initialized with invalid data, immediately show errors. | `false` |
| afterSubmit | Can be any of the following: <ul><li>**a function**, which will be called after submission</li><li>**a URL**, which the user will be sent to after submission</li><li>**an Object** that looks like `{ method: 'page', html: 'Your custom HTML' }`, which will be rendered where the form once was</li></ul> | Formrenderer will attempt to load the HTML from your Screendoor project's success page. (If you have added a confirmation email to your project, please note that afterSubmit does not override the confirmation email.)  |
| scrollToPadding | Formrenderer uses `window.scrollTo` in order to "jump" to the correct element on the page. Sometimes, you might have a fixed header that needs to be accounted for when calculating a scroll position. If so, you can set this value to the height of your fixed header. | `0` |
| responderLanguage | If you configured your Screendoor project to send email notifications to your respondents, and you want these notifications sent in a language other than the default (English), set this option to the correct language code. Currently, the options are `en`, `es`, `it`, `fr`, and `de`. | `en` |
| plugins | Enabled plugins (see below) | `['Autosave', 'WarnBeforeUnload', 'BottomBar', 'ErrorBar', 'SavedSession']` |

## Plugins

FormRenderer exposes a simple plugin system that allows for extending its core functionality. (It even comes with a few that are enabled by default -- see above in the "Options" section.)

You can add or remove plugins using the following convenience methods:

```js
FormRenderer.addPlugin('Foo')
// -> will look for FormRenderer.Plugins.Foo when initializing a form

FormRenderer.removePlugin('ErrorBar')
// -> forms created will no longer include the ErrorBar plugin
```

## Events

Since `FormRenderer` inherits the `Backbone.View` prototype, you can listen for the following events using the standard [Backbone syntax](http://backbonejs.org/#Events).

| event | description | arguments |
| --- | --- | --- |
| ready | The form has been loaded from the server and initialization is complete. | |
| errorSaving | There was an error saving the form. | `(xhr)` |
| afterSave | Triggered after the form has been saved. | |
| afterSubmit | Triggered after the form has been submitted. | |
| afterValidate | Triggered after validation of a single field or the entire form. | |
| afterValidate:one | Triggered after the validation of a single field. | `(model)` |
| afterValidate:all | Triggered after the validation of the entire form. | |
| viewRendered | A Backbone view has been rendered. Useful if you need to change certain DOM nodes before they're rendered. | `(view)` |

## Customizing

If you're ready to dive into the full power of formrenderer and need some inspiration, take a look at some examples in the [wiki](https://github.com/dobtco/formrenderer-base/wiki).

## Browser Support

Most notably, formrenderer lacks support for IE9 and earlier due to its reliance on CORS requests to the Screendoor API. Users will see an error notifying them that they'll need to visit the form on Screendoor in order to respond.

## i18n

All language strings have been placed in a `FormRenderer.t` object, and the default distribution contains language files for English only. To render a form in another language, simply modify or replace the strings inside of `FormRenderer.t`.

If you simply need to add translations to your embedded form, include the following Javascript _after_ `formrenderer.js`:

```
<script src="//d3q1ytufopwvkq.cloudfront.net/0/i18n/es.js"></script>
```

## Developing

### Getting started

You'll need [node and npm](http://nodejs.org/) installed.

1. `script/bootstrap`
2. Open `examples/index.html`
3. `grunt all` to build your changes, or `grunt watch` to automatically build when a file is changed
4. `grunt test` to run tests

### To push translations to PhraseApp

**Warning:** only run this from the master branch.

1. `PHRASEAPP_ACCESS_TOKEN=XXX phraseapp push`

### To pull new translations from PhraseApp

1. `PHRASEAPP_ACCESS_TOKEN=XXX phraseapp pull`
2. `grunt all`

### To release a new version

1. `script/release X.X.X`

[status]: https://circleci.com/gh/dobtco/formrenderer-base.svg?style=shield&circle-token=0532babff46c3141013e1c5aca8fd90d862affe9
[bower]: https://img.shields.io/bower/v/formrenderer-base.svg
