describe 'FormRenderer.Models.ResponseFieldIdentification', ->
  context 'when in a Follow-up Form', ->
    beforeEach ->
      fr = new FormRenderer Fixtures.FormRendererOptions.FOLLOW_UP_FORM()
      @model = fr.formComponents.find (rf) -> rf.field_type == 'identification'

    describe '#getValue', ->
      it 'returns null even if name/email is present', ->
        expect(@model.getValue()).to.equal(null)

    describe '#shouldPersistValue', ->
      it 'returns false', ->
        expect(@model.shouldPersistValue()).to.equal(false)

  context 'when not in a Follow-up form', ->
    beforeEach ->
      fr = new FormRenderer Fixtures.FormRendererOptions.BLANK_IDENTIFIED()
      @model = fr.formComponents.find (rf) -> rf.field_type == 'identification'

    describe '#getValue', ->
      it 'returns the value', ->
        expect(@model.getValue()).to.eql({})

        @model.set(
          value:
            name: 'bilbo'
            email: 'b@shire.net'
        )

        expect(@model.getValue()).to.eql({ name: 'bilbo', email: 'b@shire.net' })

    describe '#shouldPersistValue', ->
      it 'returns true', ->
        expect(@model.shouldPersistValue()).to.equal(true)
