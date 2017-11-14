FormRenderer.formComponentViewClass = (field) ->
  if field.group
    FormRenderer.Views.ResponseFieldRepeatingGroup
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

FormRenderer.formComponentModelClass = (field) ->
  FormRenderer.Models["ResponseField#{_str.classify(field.field_type)}"]

FormRenderer.buildFormComponentModel = (field, fr, parent) ->
  console.log('building model for ')
  console.log(field)
  klass = FormRenderer.formComponentModelClass(field)
  new klass(field, fr, parent)
