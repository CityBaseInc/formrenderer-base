FormRenderer.Views.ResponseFieldParagraph = FormRenderer.Views.ResponseField.extend
  field_type: 'paragraph'

FormRenderer.Models.ResponseFieldParagraph = FormRenderer.Models.ResponseField.extend
  field_type: 'paragraph'
  validators: [FormRenderer.Validators.MinMaxLengthValidator]
