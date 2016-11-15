FormRenderer.Models.BaseFormComponent = Backbone.DeepModel.extend
  # @param @fr the fr instance
  # @param @parent either the fr instance, or the RepeatingGroupEntry
  # that this field belongs to.
  initialize: (_, @fr, @parent) ->
    @afterInitialize()

  afterInitialize: ->
    # nada

  sync: ->
    # nada

  shouldPersistValue: ->
    @isVisible &&
    (@group || @input_field)

  getConditions: ->
    @get('conditions') || []

  isRequired: ->
    @get('required')

  isConditional: ->
    @getConditions().length > 0

  # @return [Boolean] true if the new value is different than the old value
  calculateVisibility: ->
    prevValue = !!@isVisible

    @isVisible = (
      # If we're not in a form_renderer context, it's visible
      if !@fr
        true
      else
        if @isConditional()
          _[@conditionMethod()] @getConditions(), (conditionHash) =>
            conditionChecker = new FormRenderer.ConditionChecker(
              @parent.formComponents.get(conditionHash.response_field_id),
              conditionHash
            )

            conditionChecker.isVisible()
        else
          true
    )

    prevValue != @isVisible

  conditionMethod: ->
    if @get('condition_method') == 'any'
      'any'
    else
      'all'
