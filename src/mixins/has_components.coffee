# Must implement:
#  - reflectConditions()
HasComponents =
  getValue: ->
    _.tap {}, (h) =>
      @formComponents.each (c) ->
        h[c.get('id')] = c.getValue() if c.shouldPersistValue()

  initFormComponents: (fieldData, responseData) ->
    @formComponents = new Backbone.Collection

    # @response_fields has been deprecated as of October 2017 in favor of using
    # @formComponents instead, but is still temporarily included for the sake of
    # backwards-compatibility.
    @response_fields = @formComponents

    for field in fieldData
      model = FormRenderer.buildFormComponentModel(field, @fr, @)
      model.setExistingValue(responseData[model.get('id')])
      @formComponents.add model

    @initConditions()

    @listenTo @formComponents, 'change:value change:value.*', (rf) ->
      @runConditions(rf)
      @fr.responsesChanged()

  initConditions: ->
    @allConditions = _.flatten(
      @formComponents.map (rf) ->
        _.map rf.getConditions(), (c) ->
          _.extend {}, c, parent: rf
    )

  conditionsForResponseField: (rf) ->
    _.filter @allConditions, (condition) ->
      "#{condition.response_field_id}" == "#{rf.id}"

  runConditions: (rf) ->
    needsRender = false

    _.each @conditionsForResponseField(rf), (c) ->
      if c.parent.calculateVisibilityIsChanged()
        needsRender = true

    @reflectConditions() if needsRender

_.extend FormRenderer.prototype, HasComponents
_.extend FormRenderer.Models.ResponseFieldRepeatingGroupEntry.prototype, HasComponents
