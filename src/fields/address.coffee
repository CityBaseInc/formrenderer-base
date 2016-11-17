FormRenderer.Models.ResponseFieldAddress = FormRenderer.Models.ResponseField.extend
  field_type: 'address'
  setExistingValue: (x) ->
    FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    @set('value.country', 'US') unless x?.country

  hasValue: ->
    if @get('address_format') == 'country'
      !!@get('value.country')
    else
      # Don't accept "country" as a present value, since it's set by default
      @hasValueHashKey ['street', 'city', 'state', 'zipcode']

  toText: ->
    _.values(_.pick(@getValue() || {}, 'street', 'city', 'state', 'zipcode', 'country')).join(' ')

FormRenderer.Views.ResponseFieldAddress = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  initialize: ->
    FormRenderer.Views.ResponseField::initialize.apply @, arguments
    @listenTo @model, 'change:value.country', @render
