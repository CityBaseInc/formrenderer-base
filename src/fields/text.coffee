FormRenderer.Views.ResponseFieldText = FormRenderer.Views.ResponseField.extend
  field_type: 'text'

FormRenderer.Models.ResponseFieldText = FormRenderer.Models.ResponseField.extend
  field_type: 'text'
  validators: [FormRenderer.Validators.MinMaxLengthValidator]
