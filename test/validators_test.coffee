beforeEach ->
  @fr = new FormRenderer
    project_id: 2
    response:
      id: 'xxx'
      responses: {}
    response_fields: []

  @assertValid = (value) ->
    @model.unset('value')
    @model.set('value', value)
    expect(@validator.validate()).to.be(undefined)

  @assertInvalid = (value) ->
    @model.unset('value')
    @model.set('value', value)
    expect(@validator.validate()).not.to.be(undefined)

describe 'DateValidator', ->
  beforeEach ->
    @model = new FormRenderer.Models.ResponseFieldDate
    @validator = new FormRenderer.Validators.DateValidator(@model)

  it 'validates properly', ->
    for x in ValidationFixtures.DATE.valid
      @assertValid.call @, x

    for x in ValidationFixtures.DATE.invalid
      @assertInvalid.call @, x

describe 'EmailValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldEmail
    @validator = new FormRenderer.Validators.EmailValidator(@model)

  it 'validates properly', ->
    for x in ValidationFixtures.EMAIL.valid
      @assertValid.call @, x

    for x in ValidationFixtures.EMAIL.invalid
      @assertInvalid.call @, x

describe 'NumberValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber
    @validator = new FormRenderer.Validators.NumberValidator(@model)

  it 'validates properly', ->
    for x in ValidationFixtures.NUMBER.valid
      @assertValid.call @, x

    for x in ValidationFixtures.NUMBER.invalid
      @assertInvalid.call @, x

describe 'PriceValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldPrice
    @validator = new FormRenderer.Validators.PriceValidator(@model)

  it 'validates properly', ->
    for x in ValidationFixtures.PRICE.valid
      @assertValid.call @, x

    for x in ValidationFixtures.PRICE.invalid
      @assertInvalid.call @, x

describe 'TimeValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldTime
    @validator = new FormRenderer.Validators.TimeValidator(@model)

  it 'validates properly', ->
    for x in ValidationFixtures.TIME.valid
      @assertValid.call @, x

    for x in ValidationFixtures.TIME.invalid
      @assertInvalid.call @, x

describe 'MinMaxLengthValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldParagraph
    @validator = new FormRenderer.Validators.MinMaxLengthValidator(@model)

  describe 'characters', ->
    before ->
      @model.set('field_options', minlength: '5', maxlength: '10')

    it 'validates properly', ->
      for x in ValidationFixtures.MIN_MAX_LENGTH_CHARACTERS.valid
        @assertValid.call @, x

      for x in ValidationFixtures.MIN_MAX_LENGTH_CHARACTERS.invalid
        @assertInvalid.call @, x

  describe 'words', ->
    before ->
      @model.set('field_options', minlength: '2', maxlength: '3', min_max_length_units: 'words')

    it 'validates properly', ->
      for x in ValidationFixtures.MIN_MAX_LENGTH_WORDS.valid
        @assertValid.call @, x

      for x in ValidationFixtures.MIN_MAX_LENGTH_WORDS.invalid
        @assertInvalid.call @, x

describe 'MinMaxValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber(
      field_options: { min: '5', max: '10' }
    )

    @validator = new FormRenderer.Validators.MinMaxValidator(@model)

  it 'validates properly', ->
    for x in ValidationFixtures.MIN_MAX.valid
      @assertValid.call @, x

    for x in ValidationFixtures.MIN_MAX.invalid
      @assertInvalid.call @, x

describe 'IntegerValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber(
      field_options: { integer_only: true }
    )

    @validator = new FormRenderer.Validators.IntegerValidator(@model)

  it 'validates properly', ->
    for x in ValidationFixtures.INTEGER.valid
      @assertValid.call @, x

    for x in ValidationFixtures.INTEGER.invalid
      @assertInvalid.call @, x
