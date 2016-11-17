FormRenderer.Models.ResponseFieldConfirm = FormRenderer.Models.ResponseField.extend
  field_type: 'confirm'
  wrapper: 'none'
  getValue: ->
    @get('value') || false # Send `false` instead of null
  setExistingValue: (x) ->
    @set('value', !!x)
  toText: ->
    # These act as constants
    if @get('value')
      'Yes'
    else
      'No'
