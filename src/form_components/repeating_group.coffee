FormRenderer.Models.RepeatingGroup = FormRenderer.Models.BaseFormComponent.extend
  group: true

  afterInitialize: ->
    @calculateVisibility()
    @entries = []

  setEntries: (entryValues) ->
    @entries = _.map entryValues, (entryValue) =>
      new FormRenderer.Models.RepeatingGroupEntry(
        { value: entryValue },
        @fr,
        @
      )

  addEntry: ->
    @entries.push(
      new FormRenderer.Models.RepeatingGroupEntry({}, @fr, @)
    )

  removeEntry: (idx) ->
    @entries.splice(idx, 1)

  getValue: ->
    _.invoke @entries, 'getValue'

FormRenderer.Models.RepeatingGroupEntry = Backbone.Model.extend
  initialize: (_attrs, @fr, @repeatingGroup) ->
    @formComponents = new Backbone.Collection

    for rf in @repeatingGroup.get('children')
      model = new FormRenderer.Models["ResponseField#{_str.classify(rf.field_type)}"](rf, @fr, @)
      model.setExistingValue(@get('value')?[model.get('id')]) if model.input_field
      @formComponents.add model

    @listenTo @formComponents, 'change:value change:value.*', =>
      @repeatingGroup.trigger('entryChange')

    FormRenderer.initConditions(@)

  reflectConditions: ->
    @trigger 'reflectConditions'

  getValue: ->
    _.tap {}, (h) =>
      @formComponents.each (c) ->
        h[c.get('id')] = c.getValue() if c.shouldPersistValue()

FormRenderer.Views.RepeatingGroup = Backbone.View.extend
  attributes:
    style: 'border: 1px solid gray; padding: 10px;'

  className: 'fr_repeating_group'

  events:
    'click .js-remove-entry': 'removeEntry'
    'click .js-add-entry': 'addEntry'

  initialize: (options) ->
    @form_renderer = options.form_renderer
    @model = options.model
    @$el.attr('id', "fr_repeating_group_#{@model.id}") if @model.id

  reflectConditions: ->
    if @model.isVisible
      @$el.show()
    else
      @$el.hide()

  addEntry: ->
    @model.addEntry()
    @render()

  removeEntry: (e) ->
    idx = @$el.find('.js-remove-entry').index(e.target)
    @model.removeEntry(idx)
    @render()

  render: ->
    @$el.html JST['partials/repeating_group'](@)
    $entries = @$el.find('.repeating_group_entries')

    if @model.entries.length > 0
      for entry, idx in @model.entries
        view = new FormRenderer.Views.RepeatingGroupEntry(
          entry: entry,
          form_renderer: @form_renderer,
          idx: idx
        )

        $entries.append view.render().el
    else
      $entries.text('None')

    @form_renderer?.trigger 'viewRendered', @
    @

FormRenderer.Views.RepeatingGroupEntry = Backbone.View.extend
  attributes:
    style: 'border: 1px solid gray; padding: 10px; margin: 10px;'

  className: 'fr_repeating_group_entry'

  initialize: (options) ->
    @entry = options.entry
    @form_renderer = options.form_renderer
    @idx = options.idx
    @views = []

    @listenTo @entry, 'reflectConditions', @reflectConditions

  render: ->
    @$el.html JST['partials/repeating_group_entry'](@)
    $children = @$el.find('.repeating_group_entry_fields')

    @entry.formComponents.each (rf) =>
      view = new FormRenderer.Views["ResponseField#{_str.classify(rf.get('field_type'))}"](
        model: rf,
        form_renderer: @form_renderer
      )

      $children.append view.render().el
      view.reflectConditions()
      @views.push view

    @

  reflectConditions: ->
    for view in @views
      view.reflectConditions()
