# Must implement:
#  - reflectConditions()
HasComponents =
  getValue: ->
    _.tap {}, (h) =>
      @formComponents.each (c) ->
        h[c.get('id')] = c.getValue() if c.shouldPersistValue()

  initConditions: ->
    allConditions = _.flatten(
      @formComponents.map (rf) ->
        _.map rf.getConditions(), (c) ->
          _.extend {}, c, parent: rf
    )

    conditionsForResponseField = (rf) ->
      _.filter allConditions, (condition) ->
        "#{condition.response_field_id}" == "#{rf.id}"

    runConditions = (rf) =>
      needsRender = false

      _.each conditionsForResponseField(rf), (c) ->
        if c.parent.calculateVisibility()
          needsRender = true

      @reflectConditions() if needsRender

    @listenTo @formComponents, 'change:value change:value.*', (rf) =>
      runConditions(rf)


  # Create a collection for our response fields
  initFormComponents: (fieldData, responseData) ->
    @formComponents = new Backbone.Collection

    for field in fieldData
      if field.type == 'group'
        model = new FormRenderer.Models.RepeatingGroup(field, @fr, @)
        model.setEntries(responseData[model.get('id')])
      else
        model = new FormRenderer.Models["ResponseField#{_str.classify(field.field_type)}"](field, @fr, @)
        model.setExistingValue(responseData[model.get('id')]) if model.input_field

      @formComponents.add model

    @initConditions()

  initConditions: ->
    @allConditions = _.flatten(
      @formComponents.map (rf) ->
        _.map rf.getConditions(), (c) ->
          _.extend {}, c, parent: rf
    )

    @listenTo @formComponents, 'change:value change:value.*', (rf) =>
      @runConditions(rf)

  conditionsForResponseField: (rf) ->
    _.filter @allConditions, (condition) ->
      "#{condition.response_field_id}" == "#{rf.id}"

  runConditions: (rf) ->
    needsRender = false

    _.each @conditionsForResponseField(rf), (c) ->
      if c.parent.calculateVisibility()
        needsRender = true

    @reflectConditions() if needsRender

_.extend FormRenderer.prototype, HasComponents
_.extend FormRenderer.Models.RepeatingGroupEntry.prototype, HasComponents
