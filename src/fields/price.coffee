FormRenderer.Validators.PriceValidator =
  validate: (model) ->
    values = []

    if model.get('value.dollars')
      values.push(
        model.get('value.dollars').replace(/,/g, '').replace(/^\$/, '')
      )
    if model.get('value.cents')
      values.push(model.get('value.cents'))

    unless _.every(values, (x) -> x.match(/^-?\d+$/))
      'price'

FormRenderer.Models.ResponseFieldPrice = FormRenderer.Models.ResponseField.extend
  validators: [
    FormRenderer.Validators.PriceValidator
    FormRenderer.Validators.MinMaxValidator
  ]
  field_type: 'price'
  hasValue: ->
    @hasValueHashKey ['dollars', 'cents']
  toText: ->
    raw = @getValue() || {}
    "#{raw.dollars|| '0'}.#{raw.cents || '00'}"

FormRenderer.Views.ResponseFieldPrice = FormRenderer.Views.ResponseField.extend
  wrapper: 'fieldset'
  events: _.extend {}, FormRenderer.Views.ResponseField::events,
    'blur [data-rv-input="model.value.cents"]': 'formatCents'

  formatCents: (e) ->
    cents = $(e.target).val()
    if cents && cents.match(/^\d$/)
      @model.set('value.cents', "0#{cents}")
