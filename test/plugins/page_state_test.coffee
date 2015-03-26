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
