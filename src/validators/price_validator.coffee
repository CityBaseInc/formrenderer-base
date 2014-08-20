class FormRenderer.Validators.PriceValidator extends FormRenderer.Validators.BaseValidator
  validate: ->
    return unless @model.field_type == 'price'

    values = []

    values.push(@model.get('value.dollars').replace(/,/g, '')) if @model.get('value.dollars')
    values.push(@model.get('value.cents')) if @model.get('value.cents')

    unless _.every(values, (x) -> x.match(/^-?\d+$/))
      "isn't a valid price"
