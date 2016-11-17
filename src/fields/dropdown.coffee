FormRenderer.Models.ResponseFieldDropdown = FormRenderer.Models.ResponseField.extend
  field_type: 'dropdown'
  setExistingValue: (x) ->
    if x?
      FormRenderer.Models.ResponseField::setExistingValue.apply @, arguments
    else
      checkedOption = _.find @getOptions(), (option) ->
        FormRenderer.toBoolean(option.checked)

      if !checkedOption && !@get('include_blank_option')
        checkedOption = _.first @getOptions()

      if checkedOption
        @set 'value', checkedOption.label
      else
        @unset 'value'
