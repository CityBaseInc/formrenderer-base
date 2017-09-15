FormRenderer.Models.ResponseFieldCheckboxes = FormRenderer.Models.ResponseField.extend
  field_type: 'checkboxes'
  wrapper: 'fieldset'

  setExistingValue: (x) ->
    if !x?
      h = { checked: [] }

      # Set default values
      for option in @getOptions()
        if FormRenderer.toBoolean(option.checked)
          h.checked.push(option.label)

      @set('value', h)
    else
      FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments

  toText: ->
    arr = @get('value.checked')?.slice(0) || []

    if @get('value.other_checked') == true
      arr.push @get('value.other_text')

    arr.join(' ')

  hasValue: ->
    @get('value.checked')?.length > 0 ||
    @get('value.other_checked')

FormRenderer.Views.ResponseFieldCheckboxes = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'checkboxes'
