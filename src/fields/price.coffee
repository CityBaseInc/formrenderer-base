FormRenderer.Models.ResponseFieldPrice = FormRenderer.Models.ResponseField.extend
  wrapper: 'fieldset'
  field_type: 'price'
  hasValue: ->
    @hasValueHashKey ['dollars', 'cents']
  toText: ->
    raw = @getValue() || {}
    "#{raw.dollars|| '0'}.#{raw.cents || '00'}"

  validateType: ->
    values = []

    if @get('value.dollars')
      values.push(
        @get('value.dollars').replace(/,/g, '').replace(/^\$/, '')
      )
    if @get('value.cents')
      values.push(@get('value.cents'))

    unless _.every(values, (x) -> x.match(/^-?\d+$/))
      'price'

FormRenderer.Views.ResponseFieldPrice = FormRenderer.Views.ResponseField.extend
  events: _.extend {}, FormRenderer.Views.ResponseField::events,
    'blur [data-rv-input="model.value.cents"]': 'formatCents'

  formatCents: (e) ->
    cents = $(e.target).val()
    if cents && cents.match(/^\d$/)
      @model.set('value.cents', "0#{cents}")
