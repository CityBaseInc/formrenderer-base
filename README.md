formrenderer-base [![status]](https://circleci.com/gh/dobtco/formrenderer-base/tree/master) ![bower]
=================

formrenderer-base is a JavaScript library for rendering an HTML form from a JSON definition, and persisting form submissions back to a server via AJAX. This is the library used for rendering forms inside of [Screendoor](http://www.dobt.co/screendoor), and as such, it's pretty tightly coupled to Screendoor's server API. There's a couple different ways this library can be used:

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
    "project_id": 2, // REQUIRED: your Screendoor project ID.
  });
</script>
```

Of course, there's a lot more you can do...

## Options

| option | description | default |
| --- | --- | --- |
| project_id | Your Screendoor project ID, which can be found on your project settings page |  |
| onReady | A function to call once the form is fully-loaded |  |
| target | jQuery selector for the element in which to render your form. Can also be a DOM node. | `'[data-formrenderer]'` |
| enablePages | If the form contains multiple pages, render them. Set to `false` to render all response fields on the same page. | `true` |
| validateImmediately | If the form is initialized with invalid data, immediately show errors. | `false` |
| afterSubmit | Can be any of the following: **a function**, which will be called after submission, **a URL**, which the user will be sent to after submission, or **an Object** that looks like `{ method: 'page', html: 'Your custom HTML' }`, which will be rendered where the form once was. | Logs a sweet info message to the `console`. |
| scrollToPadding | Formrenderer uses `window.scrollTo` in order to "jump" to the correct element on the page. Sometimes, you might have a fixed header that needs to be accounted for when calculating a scroll position. If so, you can set this value to the height of your fixed header. | `0` |
| plugins | Enabled plugins (see below) | `['Autosave', 'WarnBeforeUnload', 'BottomBar', 'ErrorBar', 'LocalStorage']` |

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

## Developing

You'll need [node and npm](http://nodejs.org/) installed.

1. `npm install`
2. `bower install`
3. `grunt all && grunt watch`
4. open `examples/index.html` and you're all set! To run tests: `grunt test`

When you're ready to release a new version:

1. `grunt test` to make sure everything is working
2. `grunt release` to bump the patch version, create a new git tag, [etc](https://github.com/geddski/grunt-release), and push to s3
3. `grunt release:autoupdated` to push to the `/0/` directory on s3.

[status]: https://circleci-badges.herokuapp.com/dobtco/formrenderer-base/0532babff46c3141013e1c5aca8fd90d862affe9
[bower]: https://img.shields.io/bower/v/formrenderer-base.svg
