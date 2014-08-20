class FormRenderer.Validators.MinMaxLengthValidator extends FormRenderer.Validators.BaseValidator
  validate: ->
    return unless @model.get('field_options.minlength') || @model.get('field_options.maxlength')

    @min = parseInt(@model.get('field_options.minlength'), 10) || undefined
    @max = parseInt(@model.get('field_options.maxlength'), 10) || undefined

    count = if @model.get('field_options.min_max_length_units') == 'words'
      @countWords()
    else
      @countCharacters()

    if @min && count < @min
      'is too short'
    else if @max && count > @max
      'is too long'

  countWords: ->
    (_.trim(@model.get('value')).replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || '').length

  countCharacters: ->
    _.trim(@model.get('value')).replace(/\s/g, '').length
