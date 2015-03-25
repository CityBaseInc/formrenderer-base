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

describe 'handling blank forms', ->
  it 'submits a blank form', ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.BLANK()
    @fr.submit = sinon.spy()
    expect($('[data-js-back]').length).to.equal(0)
    $('button:contains("Submit")').click()
    expect(@fr.submit).to.have.been.called

  it 'submits a blank form (with identification)', ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.BLANK_IDENTIFIED()
    @fr.submit = sinon.spy()
    expect($('[data-js-back]').length).to.equal(0)
    $('input[type=text]').val('asdf@asdf.com') # fill in name *and* email
    $('button:contains("Submit")').click()
    expect(@fr.submit).to.have.been.called

describe 'page state', ->
  describe 'when disabled (default)', ->
    it 'it ignores the hash', ->
      window.location.hash = 'page3'
      fr = new FormRenderer Fixtures.FormRendererOptions.CONDITIONAL()
      expect(fr.state.get('activePage')).to.equal(1)

  describe 'when enabled', ->
    it 'uses the hash to set the first page', ->
      window.location.hash = 'page3'
      fr = new FormRenderer Fixtures.FormRendererOptions.PAGE_STATE()
      expect(fr.state.get('activePage')).to.equal(3)

    it 'ignores pages that are not visible', ->
      window.location.hash = 'page2'
      fr = new FormRenderer Fixtures.FormRendererOptions.PAGE_STATE()
      expect(fr.state.get('activePage')).to.equal(1)

    it 'ignores invalid pages', ->
      window.location.hash = 'page12345'
      fr = new FormRenderer Fixtures.FormRendererOptions.PAGE_STATE()
      expect(fr.state.get('activePage')).to.equal(1)

      window.location.hash = 'foobarbaz'
      fr = new FormRenderer Fixtures.FormRendererOptions.PAGE_STATE()
      expect(fr.state.get('activePage')).to.equal(1)

    it 'changes the hash when changing pages', ->
      window.location.hash = ''
      fr = new FormRenderer Fixtures.FormRendererOptions.PAGE_STATE()
      expect(fr.state.get('activePage')).to.equal(1)
      expect(window.location.hash).to.equal('')
      $('button:contains("Next page")').click()
      expect(window.location.hash).to.equal('#page3')

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

describe '#submit', ->
  before ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.LOADED()

  it 'does not save while uploads are in progress', ->
    FormRenderer::save = sinon.spy()
    @fr.requests = 1
    @fr.submit()
    expect(FormRenderer::save).to.not.have.been.called

  it 'saves if uploads are not in progress', ->
    FormRenderer::save = sinon.spy()
    @fr.requests = 0
    @fr.submit()
    expect(FormRenderer::save).to.have.been.called

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
