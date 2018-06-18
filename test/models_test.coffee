describe 'FormRenderer.Models.ResponseFieldIdentification', ->
  context 'when in a Follow-up Form', ->
    describe '#getValue', ->
      it 'returns null even if name/email is present', ->
        fr = new FormRenderer Fixtures.FormRendererOptions.FOLLOW_UP_FORM()

        model = fr.formComponents.find (rf) -> rf.field_type == 'identification'

        expect(model.getValue()).to.equal(null)

  context 'when not in a Follow-up form', ->
    describe '#getValue', ->
      it 'returns the value', ->
        fr = new FormRenderer Fixtures.FormRendererOptions.BLANK_IDENTIFIED()

        model = fr.formComponents.find (rf) -> rf.field_type == 'identification'

        expect(model.getValue()).to.eql({})

        model.set(
          value:
            name: 'bilbo'
            email: 'b@shire.net'
        )

        expect(model.getValue()).to.eql({ name: 'bilbo', email: 'b@shire.net' })
