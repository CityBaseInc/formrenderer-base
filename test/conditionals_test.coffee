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

  it 'renders with existing values', ->
    $('body').html('<div data-formrenderer />')
    data = Fixtures.FormRendererOptions.CONDITIONAL()
    data.response_fields[0].field_options.options[0].checked = false
    data.response_fields[0].field_options.options[1].checked = true
    @fr = new FormRenderer data

    expect(
      $('.fr_response_field:contains("Dang, that sucks.")').is(':visible')
    ).to.equal(true)

  it 'checks multiple conditions', ->
    $('body').html('<div data-formrenderer />')
    @fr = new FormRenderer Fixtures.FormRendererOptions.CONDITIONAL_THREE()

    isVisible = ->
      $('.fr_response_field:contains("Why do you like the word")').is(':visible')

    expect(isVisible()).to.equal(false)
    check 'Question 1', 'Yes'
    expect(isVisible()).to.equal(false)
    check 'Question 2', 'No'
    expect(isVisible()).to.equal(false)
    check 'Question 2', 'Yes'
    expect(isVisible()).to.equal(true)

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

# Since we're sharing fixtures, this function is desgined to "mimic" the
# ResponseField#transformed_response_value method on the server.
transformRawValue = (key, value) ->
  switch key
    when 'radio'
      {
        selected: value
      }
    else
      value

describe 'ConditionChecker', ->
  describe 'values', ->
    it 'gets the text value for each response field', ->
      for key, field of Fixtures.Conditional.values
        for testValues in field.tests
          model = new FormRenderer.Models["ResponseField#{_.str.classify(key)}"](
            field.attrs || {}
          )
          model.setExistingValue transformRawValue(key, testValues.in)
          expect(model.toText()).to.eql(testValues.out)

  describe 'methods', ->
    beforeEach ->
      @fr = new FormRenderer Fixtures.FormRendererOptions.SHORT()

    it 'calculates', ->
      for method, deets of Fixtures.Conditional.methods
        conditional =
          method: method
          action: 'show'
          value: deets.value
          response_field_id: '35'

        checker = new FormRenderer.ConditionChecker(@fr, conditional)

        for x in deets.true
          checker.value = x
          expect(checker.isVisible()).to.eql(true)

        for x in deets.false
          checker.value = x
          expect(checker.isVisible()).to.eql(false)
