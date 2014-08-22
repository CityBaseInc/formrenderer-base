beforeEach ->
  $('body').html('<div data-formrenderer />')

describe 'state', ->
  beforeEach ->
    @fr = new FormRenderer
      project_id: 1
      response_fields: []
      response:
        id: 'xxx'
        responses: {}

  describe 'hasChanges', ->
    it 'initially does not have changes', ->
      expect(@fr.state.get('hasChanges')).to.equal(false)

    describe 'after change event is fired', ->
      beforeEach ->
        @fr.response_fields.trigger('change')

      it 'has changes', ->
        expect(@fr.state.get('hasChanges')).to.equal(true)

describe 'local storage', ->
  it 'saves the draft ID'
  it 'loads the draft ID'
  it 'removes the draft ID after submitting'

describe '#loadFromServer', ->
  it 'loads just the project'
  it 'loads just the draft'
  it 'loads both project and draft'
  it 'removes the draft ID on error'

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
