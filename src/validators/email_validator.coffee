class FormRenderer.Validators.EmailValidator extends FormRenderer.Validators.BaseValidator
  validate: ->
    return unless @model.field_type == 'email'

    unless @model.get('value').match('@')
      'not a valid email'
