before ->
  $('body').html('<div data-formrenderer />')

describe 'BottomBar', ->
  it 'is enabled by default', ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.LOADED()
    expect($('.fr_bottom:contains("Submit")').length).to.be.ok

  it 'disables the bar', ->
    @fr = new FormRenderer _.extend {}, Fixtures.FormRendererOptions.LOADED(), plugins: _.without(FormRenderer::plugins, 'BottomBar')
    expect($('.fr_bottom:contains("Submit")').length).to.not.be.ok
