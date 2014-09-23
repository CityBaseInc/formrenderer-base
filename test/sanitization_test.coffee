before ->
  $('body').html('<div data-formrenderer />')

  @createFormRendererWithFieldDescription = (x) ->
    new FormRenderer
      project_id: 1
      response:
        id: 'xxx'
        responses: {}
      response_fields: [
        field_type: 'text'
        label: 'yooo'
        field_options:
          description: x
      ]

describe 'basic sanitization', ->
  before ->
    @createFormRendererWithFieldDescription "\n\nhihi<a href='http://www.\
google.com'>This is a link</a><script>alert('hi')</script>"

  it 'removes script tags', ->
    expect($('.fr_response_field script').length).to.equal(0)

  it 'preserves anchor tags', ->
    expect($('.fr_response_field a[href*=google]').attr('href'))
      .to
      .equal('http://www.google.com')

  it 'simple formats', ->
    expect($('.fr_response_field br').length).to.equal(2)

describe 'image tags', ->
  before ->
    @createFormRendererWithFieldDescription """
      <img src='blah.jpg' />
    """

  it 'preserves them', ->
    expect($('.fr_response_field img').length).to.equal(1)
    expect($('.fr_response_field img').attr('src')).to.equal('blah.jpg')
