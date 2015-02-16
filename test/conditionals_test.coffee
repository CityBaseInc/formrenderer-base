describe 'Conditionals', ->
  beforeEach ->
    $('body').html('<div data-formrenderer />')
    @fr = new FormRenderer Fixtures.FormRendererOptions.CONDITIONAL()

    @visiblePageNumbers = ->
      $('.fr_pagination li').map ->
        parseInt($(@).text())
      .get()

    @activePage = ->
      @fr.state.get('activePage')

    @activePageNumber = ->
      parseInt($('.fr_pagination li span').text())

  it 'renders ok', ->
    expect(@fr).to.be.ok

  it 'does not show hidden fields', ->
    expect(
      $('.fr_response_field:contains("Dang, that sucks.")').is(':visible')
    ).to.equal(false)

    select 'Do you like conditional form fields?', 'No'

    expect(
      $('.fr_response_field:contains("Dang, that sucks.")').is(':visible')
    ).to.equal(true)

  it 'does not trigger validations on hidden fields', ->
    expect(@fr.validateAllPages()).to.equal(true)

  describe 'pagination', ->
    it 'only shows visible pages', ->
      expect(@visiblePageNumbers()).to.eql([1, 2])

    it 'changes pages via next/previous', ->
      # Without middle page
      expect(@activePage()).to.eql(1)
      expect(@activePageNumber()).to.eql(1)
      $('button:contains("Next page")').click()
      expect(@activePage()).to.eql(3)
      expect(@activePageNumber()).to.eql(2)
      $('button:contains("Back to page 1")').click()
      expect(@activePage()).to.eql(1)
      expect(@activePageNumber()).to.eql(1)

      fillIn 'Guess a number...', '6'

      # With middle page
      expect(@activePage()).to.eql(1)
      expect(@activePageNumber()).to.eql(1)
      $('button:contains("Next page")').click()
      expect(@activePage()).to.eql(2)
      expect(@activePageNumber()).to.eql(2)
      fillIn 'Why do you like big numbers?', 'asdf'
      $('button:contains("Next page")').click()
      expect(@activePage()).to.eql(3)
      expect(@activePageNumber()).to.eql(3)
      $('button:contains("Back to page 2")').click()
      expect(@activePage()).to.eql(2)
      expect(@activePageNumber()).to.eql(2)
      $('button:contains("Back to page 1")').click()
      expect(@activePage()).to.eql(1)
      expect(@activePageNumber()).to.eql(1)

    it 'changes pages via pagination links', ->
      expect(@activePage()).to.eql(1)
      expect(@activePageNumber()).to.eql(1)
      $('.fr_pagination li a:contains("2")').click()
      expect(@activePage()).to.eql(3)
      expect(@activePageNumber()).to.eql(2)
      $('.fr_pagination li a:contains("1")').click()
      expect(@activePage()).to.eql(1)
      expect(@activePageNumber()).to.eql(1)

  describe '#getValue', ->
    it 'only serializes the values of visible fields', ->
      expect(_.size(@fr.getValue())).to.equal(5)

      # With another visible
      fillIn 'Guess a number...', '6'
      expect(_.size(@fr.getValue())).to.equal(6)

      # Back to not visible
      fillIn 'Guess a number...', '5'
      expect(_.size(@fr.getValue())).to.equal(5)
