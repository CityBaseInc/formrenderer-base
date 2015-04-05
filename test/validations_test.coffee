before ->
  $('body').html('<div data-formrenderer />')

  @errorCount = ->
    $('.fr_error').filter(':visible').length

describe 'validations', ->
  beforeEach ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.KITCHEN_SINK_REQ()

  it 'does not validate an input on change', ->
    fillIn 'Paragraph', 'asdf'
    expect(@errorCount()).to.equal(0)

  it 'validates an input on blur', ->
    fillIn 'Paragraph', 'asdf'
    labelToInput('Paragraph').trigger('blur')
    expect(@errorCount()).to.equal(1)

  it 'does not validate when changing pages', ->
    expect(activePageNumber()).to.equal(1)
    $('[data-fr-next-page]').click()
    expect(activePageNumber()).to.equal(2)

  it 'validates when submitting', ->
    $('[data-fr-next-page]').click()
    $('[data-fr-next-page]').click()
    expect(@errorCount()).to.equal(12)

  describe 'when validation errors exist', ->
    beforeEach ->
      $('[data-fr-next-page]').click()
      $('[data-fr-next-page]').click()

    it 'allows the user to fix errors', ->
      choose('Choice #1')
      expect(@errorCount()).to.equal(11)

    it 'does not show a new error until the user blurs the input', ->
      fillIn('Date', 'as')
      expect(@errorCount()).to.equal(11)
      labelToInput('Date').trigger('blur')
      expect(@errorCount()).to.equal(12)

    it 'navigates to the first error when the user clicks "fix errors"', ->
      expect(activePageNumber()).to.equal(2)
      $('a:contains("Fix errors")').click()
      expect(activePageNumber()).to.equal(1)
      expect($(document.activeElement).attr('id')).
        to.equal(labelToInput('Text').attr('id'))

      # After the first input is filled in...
      fillIn 'Text', 'foo'
      $('[data-fr-next-page]').click()
      $('[data-fr-next-page]').click()
      $('a:contains("Fix errors")').click()
      expect(activePageNumber()).to.equal(1)
      expect($(document.activeElement).attr('id')).
        to.equal(labelToInput('Paragraph').attr('id'))
