before ->
  @fr = new FormRenderer
    project_id: 2
    response:
      id: 'xxx'
      responses: {}
    response_fields: []

  @assertValid = (value) ->
    @model.unset('value')
    @model.set('value', value)
    expect(@validator.validate(@model)).to.equal(undefined)

  @assertInvalid = (value) ->
    @model.unset('value')
    @model.set('value', value)
    expect(@validator.validate(@model)).not.to.equal(undefined)

describe 'DateValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldDate
    @validator = FormRenderer.Validators.DateValidator

  it 'validates properly', ->
    for x in Fixtures.Validation.DATE.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.DATE.invalid
      @assertInvalid.call @, x

describe 'EmailValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldEmail
    @validator = FormRenderer.Validators.EmailValidator

  it 'validates properly', ->
    for x in Fixtures.Validation.EMAIL.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.EMAIL.invalid
      @assertInvalid.call @, x

describe 'NumberValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber(
      field_options:
        units: 'Beezles'
    )
    @validator = FormRenderer.Validators.NumberValidator

  it 'validates properly', ->
    for x in Fixtures.Validation.NUMBER.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.NUMBER.invalid
      @assertInvalid.call @, x

describe 'PriceValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldPrice
    @validator = FormRenderer.Validators.PriceValidator

  it 'validates properly', ->
    for x in Fixtures.Validation.PRICE.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.PRICE.invalid
      @assertInvalid.call @, x

describe 'TimeValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldTime
    @validator = FormRenderer.Validators.TimeValidator

  it 'validates properly', ->
    for x in Fixtures.Validation.TIME.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.TIME.invalid
      @assertInvalid.call @, x

describe 'MinMaxLengthValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldParagraph
    @validator = FormRenderer.Validators.MinMaxLengthValidator

  describe 'characters', ->
    before ->
      @model.set('field_options', minlength: '5', maxlength: '10')

    it 'validates properly', ->
      for x in Fixtures.Validation.MIN_MAX_LENGTH_CHARACTERS.valid
        @assertValid.call @, x

      for x in Fixtures.Validation.MIN_MAX_LENGTH_CHARACTERS.invalid
        @assertInvalid.call @, x

  describe 'words', ->
    before ->
      @model.set('field_options', minlength: '2', maxlength: '3', min_max_length_units: 'words')

    it 'validates properly', ->
      for x in Fixtures.Validation.MIN_MAX_LENGTH_WORDS.valid
        @assertValid.call @, x

      for x in Fixtures.Validation.MIN_MAX_LENGTH_WORDS.invalid
        @assertInvalid.call @, x

describe 'MinMaxValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber(
      field_options: { min: '5', max: '10' }
    )

    @validator = FormRenderer.Validators.MinMaxValidator

  it 'validates properly', ->
    for x in Fixtures.Validation.MIN_MAX.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.MIN_MAX.invalid
      @assertInvalid.call @, x

describe 'IntegerValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber(
      field_options: { integer_only: true }
    )

    @validator = FormRenderer.Validators.IntegerValidator

  it 'validates properly', ->
    for x in Fixtures.Validation.INTEGER.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.INTEGER.invalid
      @assertInvalid.call @, x

describe 'PhoneValidator', ->
  describe 'US format', ->
    before ->
      @model = new FormRenderer.Models.ResponseFieldPhone(
        field_options: { phone_format: 'us' }
      )

      @validator = FormRenderer.Validators.PhoneValidator

    it 'validates properly', ->
      for x in Fixtures.Validation.US_PHONE.valid
        @assertValid.call @, x

      for x in Fixtures.Validation.US_PHONE.invalid
        @assertInvalid.call @, x

  describe 'Intl format', ->
    before ->
      @model = new FormRenderer.Models.ResponseFieldPhone()
      @validator = FormRenderer.Validators.PhoneValidator

    it 'validates properly', ->
      for x in Fixtures.Validation.INTL_PHONE.valid
        @assertValid.call @, x

      for x in Fixtures.Validation.INTL_PHONE.invalid
        @assertInvalid.call @, x
