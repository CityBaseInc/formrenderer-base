describe 'Form renderer', ->
  beforeEach ->
    FormRenderer.prototype.defaults.screendoorBase = 'http://localhost'
    $('body').html('<div data-formrenderer />')

  describe 'sanitization', ->
    beforeEach ->
      @fr = new FormRenderer
        project_id: 1
        response:
          id: 'xxx'
          responses: {}
        response_fields: [
          field_type: 'text'
          label: 'yooo'
          field_options:
            description: "hi\n\n<a href='http://www.google.com'>This is a link</a><script>alert('hi')</script>"
        ]

    it 'removes script tags', ->
      expect($('.form_renderer_response_field script').length).to.equal(0)

    it 'preserves anchor tags', ->
      expect($('.form_renderer_response_field a[href*=google]').attr('href')).to.equal('http://www.google.com')

    it 'simple formats', ->
      expect($('.form_renderer_response_field br').length).to.equal(2)
