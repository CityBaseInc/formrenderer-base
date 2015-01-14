before ->
  $('body').html('<div data-formrenderer />')

describe 'Encapsulation', ->
  it 'does not share dependencies with the global namespace', ->
    expect(typeof window.ISOCountryNames).to.equal('undefined')
    expect(typeof window.FormRenderer).not.to.equal('undefined')

describe '#formatCents', ->
  before ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.KITCHEN_SINK()

  it 'formats single-digit cents properly', ->
    price = @fr.response_fields.find (rf) -> rf.field_type == 'price'
    $cents = $('.fr_response_field_price input[data-rv-input="model.value.cents"]')
    $cents.val('3').trigger('blur')
    expect($cents.val()).to.equal('03')
    expect(price.get('value.cents')).to.equal('03')

describe 'state', ->
  before ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.LOADED()

  describe 'hasChanges', ->
    it 'initially does not have changes', ->
      expect(@fr.state.get('hasChanges')).to.equal(false)

    describe 'after change event is fired', ->
      before ->
        @fr.response_fields.trigger('change')

      it 'has changes', ->
        expect(@fr.state.get('hasChanges')).to.equal(true)

describe 'local storage', ->
  it 'saves the draft ID'
  it 'loads the draft ID'
  it 'removes the draft ID after submitting'

describe '#loadFromServer', ->
  beforeEach ->
    @server = sinon.fakeServer.create()

  afterEach ->
    @server.restore()

  it 'loads just the project', ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.RESPONSE_LOADED()

    @server.requests[0].respond 200, { "Content-Type": "application/json" }, JSON.stringify(
      project:
        id: 1
        response_fields: [ _.clone(Fixtures.RESPONSE_FIELD) ]
    )

    expect($('input[type=text]').val()).to.equal('hey')

  it 'loads just the draft', ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.PROJECT_LOADED()

    @server.requests[0].respond 200, { "Content-Type": "application/json" }, JSON.stringify(
      response:
        id: 'xxx'
        responses:
          '1': 'Adam'
    )

    expect($('input[type=text]').val()).to.equal('Adam')

  it 'loads both project and draft', ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.NOT_LOADED()

    @server.requests[0].respond 200, { "Content-Type": "application/json" }, JSON.stringify(
      response:
        id: 'xxx'
        responses:
          '1': 'Adam'
      project:
        id: 1
        response_fields: [ _.clone(Fixtures.RESPONSE_FIELD) ]
    )

    expect($('label').text()).to.have.string('Name')
    expect($('input[type=text]').val()).to.equal('Adam')

  it 'removes the draft ID on error', ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.PROJECT_LOADED()

    storeSpy =
      remove: sinon.spy()

    window.store = storeSpy

    @server.requests[0].respond 400, { "Content-Type": "application/json" }, JSON.stringify({})

    expect(storeSpy.remove).to.have.been.called

describe 'options', ->
  describe 'enablePages', ->
    it 'is enabled by default'
    it 'disables pages'

  describe 'enableBottomStatusBar', ->
    it 'is enabled by default'
    it 'disables the bar'

  describe 'enableErrorAlertBar', ->
    it 'is enabled by default'
    it 'disables the bar'

  describe 'enableAutosave', ->
    it 'is enabled by default'
    it 'disables autosave'

  describe 'warnBeforeUnload', ->
    it 'is enabled by default'
    it 'disables BeforeUnload'

  describe 'validateImmediately', ->
    it 'is false by default'
    it 'validates immediately'

describe '#save', ->
  it 'sends the correct data to the server'
  it 'sets state on success'
  it 'sets state on error'
