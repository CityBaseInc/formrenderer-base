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
<script src='//d3q1ytufopwvkq.cloudfront.net/X.X.X/formrenderer.js'></script>
<link href='//d3q1ytufopwvkq.cloudfront.net/X.X.X/formrenderer.css' rel='stylesheet' />
```

> Replace `X.X.X` with the current version number, which can be found in a badge at the top of this file.

The distributions in `dist/` contain all of the necessary dependencies **with the exception of jQuery**, which must be loaded before `formrenderer.js`.

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
| target | jQuery selector for the element in which to render your form. Can also be a DOM node. | `'[data-formrenderer]'` |
| enableAutosave | Persist changes back to the server every 5 seconds | `true` |
| enableBeforeUnload | Warn if the user leaves the page with unsubmitted responses | `true` |
| enablePages | If the form contains multiple pages, render them. Set to `false` to render all response fields on the same page. | `true` |
| enableLocalstorage | Save unsubmitted draft identifiers to localstorage, which will allow respondents to leave and return to the form without losing data. | `true` |
| validateImmediately | If the form is initialized with invalid data, immediately show errors. | `false` |
| afterSubmit | Can be any of the following: **a function**, which will be called after submission, **a URL**, which the user will be sent to after submission, or **an Object** that looks like `{ method: 'page', html: 'Your custom HTML' }`, which will be rendered where the form once was. | Logs a sweet info message to the `console`. |

## Developing

You'll need [node and npm](http://nodejs.org/) installed.

1. `npm install`
2. `bower install`
3. `grunt watch`
4. open `examples/index.html` and you're all set! To run tests: `grunt test`

When you're ready to release a new version:

1. `grunt test` to make sure everything is working
2. `grunt release` to bump the patch version and create a new git tag, [etc](https://github.com/geddski/grunt-release)
3. `grunt s3` to push to our s3 bucket

[status]: https://circleci-badges.herokuapp.com/dobtco/formrenderer-base/0532babff46c3141013e1c5aca8fd90d862affe9
[bower]: https://img.shields.io/bower/v/formrenderer-base.svg
