before ->
  $('body').html('<div data-formrenderer />')

describe '#getValue', ->
  before ->
    @fr = new FormRenderer Fixtures.FormRendererOptions.KITCHEN_SINK()

  it 'renders ok', ->
    expect(@fr).to.be.ok
