FormRenderer.Views.ResponseFieldText = FormRenderer.Views.ResponseField

FormRenderer.Models.ResponseFieldText = FormRenderer.Models.ResponseField.extend
  field_type: 'text'
  validators: [FormRenderer.Validators.MinMaxLengthValidator]
