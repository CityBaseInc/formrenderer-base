# Need to set a timeout here since we use a timeout in our codebase
expectErrorCount = (num, done) ->
  setTimeout =>
    expect(@errorCount()).to.equal(num)
    done()
  , 2

before ->
  $('body').html('<div data-formrenderer />')

  @errorCount = ->
    $('.fr_error').filter(':visible').length

describe 'validations', ->
  beforeEach ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.KITCHEN_SINK_REQ()

  it 'does not validate an input on change', (done) ->
    fillIn 'Paragraph', 'asdf'
    expectErrorCount.call(@, 0, done)

  it 'validates an input on blur', (done) ->
    fillIn 'Paragraph', 'asdf'
    labelToInput('Paragraph').trigger('blur')
    expectErrorCount.call(@, 1, done)

  it 'does not validate when changing pages', (done) ->
    expect(activePageNumber()).to.equal(1)
    $('[data-fr-next-page]').click()
    setTimeout =>
      expect(activePageNumber()).to.equal(2)
      done()
    , 2

  it 'validates when submitting', (done) ->
    $('[data-fr-next-page]').click()
    $('[data-fr-next-page]').click()
    expectErrorCount.call(@, 13, done)

  # https://github.com/dobtco/formrenderer-base/pull/58#issuecomment-90695440
  describe 'the blur/next page edge case', ->
    it 'does not validate when blurring with the "Next page" button', (done) ->
      fillIn 'Paragraph', 'asdf'
      labelToInput('Paragraph').trigger(
        $.Event('blur', relatedTarget: $('[data-fr-next-page]')[0])
      )
      expect(@errorCount()).to.equal(0)
      # After mouseup event...
      $(document).trigger('mouseup')
      expectErrorCount.call(@, 1, done)

  describe 'when validation errors exist', ->
    beforeEach ->
      $('[data-fr-next-page]').click()
      $('[data-fr-next-page]').click()

    it 'allows the user to fix errors', ->
      choose('Choice #1')
      expect(@errorCount()).to.equal(12)

    it 'does not show a new error until the user blurs the input', (done) ->
      id = $(".fr_response_field_date label:contains(\"MM\")").attr('for')
      $date = $("##{id}")
      $date.val('as').trigger('input')
      expect(@errorCount()).to.equal(12)
      $date.trigger('blur')
      expectErrorCount.call(@, 13, done)

    it 'navigates to the first error when the user clicks "fix errors"', ->
      expect(activePageNumber()).to.equal(2)
      $('a:contains("validation errors")').click()
      expect(activePageNumber()).to.equal(1)
      expect($(document.activeElement).attr('id')).
        to.equal(labelToInput('Text').attr('id'))

      # After the first input is filled in...
      fillIn 'Text', 'foo'
      $('[data-fr-next-page]').click()
      $('[data-fr-next-page]').click()
      $('a:contains("validation errors")').click()
      expect(activePageNumber()).to.equal(1)
      expect($(document.activeElement).attr('id')).
        to.equal(labelToInput('Paragraph').attr('id'))

  describe 'table field w/ preset values', ->
    beforeEach ->
      @fr = new FormRenderer Fixtures.FormRendererOptions.TABLE_REQ()

    it 'validates when submitting', (done) ->
      $('[data-fr-next-page]').click()
      expectErrorCount.call @, 1, =>
        $('[data-rv-input="model.value.1.0"]').val('foo').trigger('input')
        expectErrorCount.call(@, 0, done)
