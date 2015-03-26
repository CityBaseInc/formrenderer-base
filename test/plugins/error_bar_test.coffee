before ->
  $('body').html('<div data-formrenderer />')

describe 'ErrorBar', ->
  it 'is enabled by default', ->
    @fr = new FormRenderer _.extend {}, Fixtures.FormRendererOptions.KITCHEN_SINK(), validateImmediately: true
    expect($('.fr_error_alert_bar').length).to.be.ok

  it 'disables the bar', ->
    @fr = new FormRenderer _.extend {}, Fixtures.FormRendererOptions.KITCHEN_SINK(), plugins: _.without(FormRenderer::plugins, 'ErrorBar'), validateImmediately: true
    expect($('.fr_error_alert_bar').length).to.not.be.ok
