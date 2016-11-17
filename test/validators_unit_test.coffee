before ->
  @fr = new FormRenderer
    project_id: 'dummy_val'
    response:
      id: 'xxx'
      responses: {}
    response_fields: []

  @setValue = (value) ->
    @model.unset('value')
    @model.set('value', value)
    @model.validateComponent()

  @assertValid = (value) ->
    @setValue(value)
    expect(@model.getError()).to.equal(undefined)

  @assertInvalid = (value) ->
    @setValue(value)
    expect(@model.getError()).not.to.equal(undefined)

describe 'Date', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldDate({}, @fr, @fr)

  it 'validates properly', ->
    for x in Fixtures.Validation.DATE.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.DATE.invalid
      @assertInvalid.call @, x

describe 'Date (month/day only)', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldDate({ disable_year: true }, @fr, @fr)

  it 'validates properly', ->
    for x in Fixtures.Validation.DATE_DISABLE_YEAR.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.DATE_DISABLE_YEAR.invalid
      @assertInvalid.call @, x

describe 'Email', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldEmail({}, @fr, @fr)

  it 'validates properly', ->
    for x in Fixtures.Validation.EMAIL.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.EMAIL.invalid
      @assertInvalid.call @, x

describe 'Number', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber({ units: 'Beezles' }, @fr, @fr)

  it 'validates properly', ->
    for x in Fixtures.Validation.NUMBER.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.NUMBER.invalid
      @assertInvalid.call @, x

describe 'Price', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldPrice({}, @fr, @fr)

  it 'validates properly', ->
    for x in Fixtures.Validation.PRICE.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.PRICE.invalid
      @assertInvalid.call @, x

describe 'Time', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldTime({}, @fr, @fr)

  it 'validates properly', ->
    for x in Fixtures.Validation.TIME.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.TIME.invalid
      @assertInvalid.call @, x

describe 'MinMaxLengthValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldParagraph({}, @fr, @fr)

  describe 'characters', ->
    before ->
      @model.set(minlength: '5', maxlength: '10')

    it 'validates properly', ->
      for x in Fixtures.Validation.MIN_MAX_LENGTH_CHARACTERS.valid
        @assertValid.call @, x

      for x in Fixtures.Validation.MIN_MAX_LENGTH_CHARACTERS.invalid
        @assertInvalid.call @, x

  describe 'words', ->
    before ->
      @model.set(minlength: '2', maxlength: '3', min_max_length_units: 'words')

    it 'validates properly', ->
      for x in Fixtures.Validation.MIN_MAX_LENGTH_WORDS.valid
        @assertValid.call @, x

      for x in Fixtures.Validation.MIN_MAX_LENGTH_WORDS.invalid
        @assertInvalid.call @, x

describe 'MinMaxValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber({ min: '5', max: '10' }, @fr, @fr)

  it 'validates properly', ->
    for x in Fixtures.Validation.MIN_MAX.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.MIN_MAX.invalid
      @assertInvalid.call @, x

describe 'IntegerValidator', ->
  before ->
    @model = new FormRenderer.Models.ResponseFieldNumber({ integer_only: true }, @fr, @fr)

  it 'validates properly', ->
    for x in Fixtures.Validation.INTEGER.valid
      @assertValid.call @, x

    for x in Fixtures.Validation.INTEGER.invalid
      @assertInvalid.call @, x

describe 'Phone', ->
  describe 'US format', ->
    before ->
      @model = new FormRenderer.Models.ResponseFieldPhone({ phone_format: 'us' }, @fr, @fr)

    it 'validates properly', ->
      for x in Fixtures.Validation.US_PHONE.valid
        @assertValid.call @, x

      for x in Fixtures.Validation.US_PHONE.invalid
        @assertInvalid.call @, x

  describe 'Intl format', ->
    before ->
      @model = new FormRenderer.Models.ResponseFieldPhone({}, @fr, @fr)

    it 'validates properly', ->
      for x in Fixtures.Validation.INTL_PHONE.valid
        @assertValid.call @, x

      for x in Fixtures.Validation.INTL_PHONE.invalid
        @assertInvalid.call @, x
