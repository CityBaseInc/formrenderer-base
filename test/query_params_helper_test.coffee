describe 'QueryParams', ->

  it 'parses query params', ->
    params = FormRenderer.queryParams("?test=123&token=D22")
    expect(params.test).to.equal('123')
    expect(params.token).to.equal('D22')

  it "doesn't blow up if unconventional query params are passed in", ->
    params = FormRenderer.queryParams("?test=123&where'D22 like'&name=John")
    expect(Object.keys(params).length).to.equal(2)
    expect(params.test).to.equal('123')
    expect(params.name).to.equal('John')

