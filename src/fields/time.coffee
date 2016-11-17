FormRenderer.Models.ResponseFieldTime = FormRenderer.Models.ResponseField.extend
  field_type: 'time'
  wrapper: 'fieldset'
  valueType: 'hash'
  ignoreKeysWhenCheckingPresence: ->
    ['am_pm']
  setExistingValue: (x) ->
    FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    @set('value.am_pm', 'AM') unless x?.am_pm
  toText: ->
    raw = @getValue() || {}
    "#{raw.hours || '00'}:#{raw.minutes || '00'}:#{raw.seconds || '00'} #{raw.am_pm}"

  validateType: ->
    hours = parseInt(@get('value.hours'), 10) || 0
    minutes = parseInt(@get('value.minutes'), 10) || 0
    seconds = parseInt(@get('value.seconds'), 10) || 0

    unless (1 <= hours <= 12) && (0 <= minutes <= 59) && (0 <= seconds <= 59)
      'time'
