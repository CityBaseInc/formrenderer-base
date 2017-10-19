FormRenderer.Models.ResponseFieldAddress = FormRenderer.Models.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'address'
  valueType: 'hash'

  ignoreKeysWhenCheckingPresence: ->
    if @get('address_format') == 'country'
      []
    else
      ['country']

  setExistingValue: (x) ->
    FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    @set('value.country', 'US') unless x?.country

  toText: ->
    _.values(
      _.pick(@getValue(), 'street', 'city', 'state', 'zipcode', 'country')
    ).join(' ')

FormRenderer.Views.ResponseFieldAddress = FormRenderer.Views.ResponseField.extend
  initialize: ->
    FormRenderer.Views.ResponseField::initialize.apply @, arguments
    @listenTo @model, 'change:value.country', @render
