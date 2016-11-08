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

  render: ->
    @$el.html JST['partials/repeating_group_entry'](@)
    $children = @$el.find('.repeating_group_entry_fields')

    @entry.children.each (rf) =>
      view = new FormRenderer.Views["ResponseField#{_str.classify(rf.get('field_type'))}"](
        model: rf,
        form_renderer: @form_renderer
      )

      $children.append view.render().el
      view.reflectConditions()

    @
