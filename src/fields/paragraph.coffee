FormRenderer.Models.ResponseFieldParagraph = FormRenderer.Models.ResponseField.extend
  field_type: 'paragraph'
  validators: [FormRenderer.Validators.MinMaxLengthValidator]

FormRenderer.Views.ResponseFieldParagraph = FormRenderer.Views.ResponseField
