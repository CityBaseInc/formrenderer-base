# This is a "Gold master" test. If you need to update these constants, you can do so
# by manually clicking through the kitchen sink form in the Chrome dev console and running:
#
#   copy(JSON.stringify($('[data-formrenderer]').data('form-renderer-instance').getValue()))
#
# ...which will copy the stringified JSON to your clipboard. You should then manually verify
# the output, and if you're satisfied, you can finally update the constant.

EXPECTED_BLANK_VALUES = '{"37":{"0":false,"1":false},"44":{"am_pm":"AM"},"46":false,"48":{"country":"US"},"49":{"0":["",""],"1":["",""]},"52":false}'

EXPECTED_PRESENT_VALUES = '{"35":"foo","36":"bar","37":{"0":"on","1":false},"39":"Choice #2","40":"Choice #2","41":{"dollars":"12","cents":"99"},"42":"123","43":{"month":"12","day":"30","year":"2014"},"44":{"am_pm":"PM","hours":"6","minutes":"01","seconds":"30"},"45":"http://www.google.com","46":false,"47":"foo@bar.com","48":{"country":"GB","street":"123 main st","state":null},"49":{"0":["hey",""],"1":["","nay"]},"50":{"lat":"40.7700118","lng":"-73.9800453"},"51":"510-123-4567","52":true}'

describe '#getValue', ->
  before ->
    $('body').html('<div data-formrenderer />')
    @fr = new FormRenderer Fixtures.FormRendererOptions.KITCHEN_SINK()

  it 'renders ok', ->
    expect(@fr).to.be.ok

  it 'serializes the blank values', ->
    expect(JSON.stringify(@fr.getValue())).to.equal(EXPECTED_BLANK_VALUES)

  it 'serializes present values', ->
    $('.fr_response_field_text input').val('foo').trigger('input')
    $('.fr_response_field_paragraph textarea').val('bar').trigger('input')
    $('.fr_response_field_checkboxes input').first().click().trigger('change')
    $('.fr_response_field_radio input').last().click().trigger('change')
    $('.fr_response_field_dropdown select').val('Choice #2').trigger('change')
    $('.fr_response_field_price input').first().val('12').trigger('input')
    $('.fr_response_field_price input').last().val('99').trigger('input')
    $('.fr_response_field_number input').last().val('123').trigger('input')
    $('.fr_response_field_date input').eq(0).val('12').trigger('input')
    $('.fr_response_field_date input').eq(1).val('30').trigger('input')
    $('.fr_response_field_date input').eq(2).val('2014').trigger('input')
    $('.fr_response_field_time input').eq(0).val('6').trigger('input')
    $('.fr_response_field_time input').eq(1).val('01').trigger('input')
    $('.fr_response_field_time input').eq(2).val('30').trigger('input')
    $('.fr_response_field_time select').val('PM').trigger('change')
    $('.fr_response_field_website input').val('http://www.google.com').trigger('input')
    $('.fr_response_field_email input').val('foo@bar.com').trigger('input')
    $('.fr_response_field_address input').eq(0).val('123 main st').trigger('input')
    $('.fr_response_field_address select').val('GB').trigger('change')
    $('.fr_response_field_table textarea').eq(0).val('hey').trigger('input')
    $('.fr_response_field_table textarea').eq(3).val('nay').trigger('input')
    $('.fr_response_field_phone input').val('510-123-4567').trigger('input')
    $('.fr_response_field_map_marker .fr_map_cover').click()
    $('.fr_response_field_confirm input').first().click().trigger('change')
    expect(JSON.stringify(@fr.getValue())).to.equal(EXPECTED_PRESENT_VALUES)

    # @todo file
