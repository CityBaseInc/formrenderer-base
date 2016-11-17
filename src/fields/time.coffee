FormRenderer.Validators.TimeValidator =
  validate: (model) ->
    hours = parseInt(model.get('value.hours'), 10) || 0
    minutes = parseInt(model.get('value.minutes'), 10) || 0
    seconds = parseInt(model.get('value.seconds'), 10) || 0

    unless (1 <= hours <= 12) && (0 <= minutes <= 59) && (0 <= seconds <= 59)
      'time'

FormRenderer.Models.ResponseFieldTime = FormRenderer.Models.ResponseField.extend
  validators: [FormRenderer.Validators.TimeValidator]
  field_type: 'time'
  hasValue: ->
    @hasValueHashKey ['hours', 'minutes', 'seconds']
  setExistingValue: (x) ->
    FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    @set('value.am_pm', 'AM') unless x?.am_pm
  toText: ->
    raw = @getValue() || {}
    "#{raw.hours || '00'}:#{raw.minutes || '00'}:#{raw.seconds || '00'} #{raw.am_pm}"

FormRenderer.Views.ResponseFieldTime = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
