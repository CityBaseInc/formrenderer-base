FormRenderer.formComponentViewClass = (field) ->
  if field.group
    FormRenderer.Views.RepeatingGroup
  else if (foundKlass = FormRenderer.Views["ResponseField#{_str.classify(field.field_type)}"])
    foundKlass
  else if field.input_field
    FormRenderer.Views.ResponseField
  else
    FormRenderer.Views.NonInputResponseField

FormRenderer.buildFormComponentView = (field, fr) ->
  klass = FormRenderer.formComponentViewClass(field)

  new klass(
    model: field,
    form_renderer: fr
  )
