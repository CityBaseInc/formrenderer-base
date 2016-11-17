FormRenderer.formComponentViewClass = (field) ->
  if field.group
    FormRenderer.Views.RepeatingGroup
  else if (foundKlass = FormRenderer.Views["ResponseField#{_str.classify(field.field_type)}"])
    foundKlass
  else
    FormRenderer.Views.ResponseField

FormRenderer.buildFormComponentView = (field, fr) ->
  klass = FormRenderer.formComponentViewClass(field)

  new klass(
    model: field,
    form_renderer: fr
  )
