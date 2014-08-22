describe 'Form renderer', ->
  beforeEach ->
    FormRenderer.prototype.defaults.screendoorBase = 'http://localhost'
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
