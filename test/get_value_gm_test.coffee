# This is a "Gold master" test. If you need to update these constants, you can do so
# by manually clicking through the kitchen sink form in the Chrome dev console and running:
#
#   copy(JSON.stringify($('[data-formrenderer]').data('form-renderer').getValue()))
#
# ...which will copy the stringified JSON to your clipboard. You should then manually verify
# the output, and if you're satisfied, you can finally update the constant.

EXPECTED_BLANK_VALUES = '{"37":{"0":false,"1":false},"44":{"am_pm":"AM"},"46":"","48":{"country":"US"},"49":{"0":["",""],"1":["",""]}}'

EXPECTED_PRESENT_VALUES = '{"35":"foo","36":"bar","37":{"0":"on","1":false},"39":"Choice #2","40":"Choice #2","41":{"dollars":"12","cents":"99"},"42":"123","43":{"month":"12","day":"30","year":"2014"},"44":{"am_pm":"PM","hours":"6","minutes":"01","seconds":"30"},"45":"http://www.google.com","46":"","47":"foo@bar.com","48":{"country":"GB","street":"123 main st"},"49":{"0":["hey",""],"1":["","nay"]},"50":{"lat":"40.7700000","lng":"-73.9800000"}}'

REASONABLE_AMOUNT_OF_TIME_TO_LOAD_LEAFLET = 1500

before ->
  $('body').html('<div data-formrenderer />')

describe '#getValue', ->
  before ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.KITCHEN_SINK()

    @fieldCid

  it 'renders ok', ->
    expect(@fr).to.be.ok

  it 'serializes the blank values', ->
    expect(JSON.stringify(@fr.getValue())).to.equal(EXPECTED_BLANK_VALUES)

  it 'serializes present values', (done) ->
    $('.response_field_text input').val('foo').trigger('input')
    $('.response_field_paragraph textarea').val('bar').trigger('input')
    $('.response_field_checkboxes input').first().click().trigger('change')
    $('.response_field_radio input').last().click().trigger('change')
    $('.response_field_dropdown select').val('Choice #2').trigger('change')
    $('.response_field_price input').first().val('12').trigger('input')
    $('.response_field_price input').last().val('99').trigger('input')
    $('.response_field_number input').last().val('123').trigger('input')
    $('.response_field_date input').eq(0).val('12').trigger('input')
    $('.response_field_date input').eq(1).val('30').trigger('input')
    $('.response_field_date input').eq(2).val('2014').trigger('input')
    $('.response_field_time input').eq(0).val('6').trigger('input')
    $('.response_field_time input').eq(1).val('01').trigger('input')
    $('.response_field_time input').eq(2).val('30').trigger('input')
    $('.response_field_time select').val('PM').trigger('change')
    $('.response_field_website input').val('http://www.google.com').trigger('input')
    $('.response_field_email input').val('foo@bar.com').trigger('input')
    $('.response_field_address input').eq(0).val('123 main st').trigger('input')
    $('.response_field_address select').val('GB').trigger('change')
    $('.response_field_table textarea').eq(0).val('hey').trigger('input')
    $('.response_field_table textarea').eq(3).val('nay').trigger('input')

    # @todo file, mapmarker

    setTimeout =>
      $('.response_field_map_marker .map_marker_field_cover').click()
      expect(JSON.stringify(@fr.getValue())).to.equal(EXPECTED_PRESENT_VALUES)
      done()
    , REASONABLE_AMOUNT_OF_TIME_TO_LOAD_LEAFLET
