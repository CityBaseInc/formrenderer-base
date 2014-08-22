beforeEach ->
  $('body').html('<div data-formrenderer />')

describe '#getValue', ->
  it 'returns the correct values'