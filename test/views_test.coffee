describe 'response field views', ->
  it 'can be rendered without a form_renderer instance', ->
    for field_type in FormRenderer.FIELD_TYPES
      model = new FormRenderer.Models["ResponseField#{_.str.classify(field_type)}"]

      view = new FormRenderer.Views["ResponseField#{_.str.classify(field_type)}"](
        model: model
      )

      expect(view.render()).to.be.ok

# Since we can't actually test a file upload, we'll test how the view
# responds to various events
describe 'FormRenderer.Views.ResponseFieldFile', ->
  beforeEach ->
    $('body').html('<div data-formrenderer />')

  describe 'without allow multiple', ->
    beforeEach ->
      @fr = new FormRenderer Fixtures.FormRendererOptions.FILE()
      @ifu = $('input[type=file]').data('inline-file-upload')

    it 'disables the button when starting the upload', ->
      expect($('.fr_add_file label').hasClass('disabled')).to.eql false
      @ifu.options.start(filename: 'filename yo')
      expect($('.fr_add_file label').hasClass('disabled')).to.eql true

    it 'shows upload progress and successfully completes upload', ->
      @ifu.options.start(filename: 'filename yo')
      @ifu.options.progress(percent: 95)
      expect($('.fr_add_file label').text()).to.contain('95%')
      expect($('.fr_add_file label').hasClass('disabled')).to.eql true
      @ifu.options.success(data: { file_id: 123 })
      expect($('.fr_add_file label').hasClass('disabled')).to.eql false
      expect(@fr.response_fields.models[0].get('value')).to.eql(
        [
          { id: 123, filename: 'filename yo' }
        ]
      )

    it 'shows errors', ->
      expect($('.fr_error:visible').length).to.eql 0
      @ifu.options.error(xhr: { responseJSON: { errors: 'just a fake error lol' } })
      expect($('.fr_error:visible').length).to.eql 1

    it 'does not allow more than one file by default', ->
      @ifu.options.start(filename: 'filename yo')
      @ifu.options.success(data: { file_id: 123 })
      expect($('.fr_add_file label').length).to.eql 0

  describe 'with allow_multiple', ->
    beforeEach ->
      fix = Fixtures.FormRendererOptions.FILE()
      fix.response_fields[0].allow_multiple_files = true
      @fr = new FormRenderer fix
      @ifu = $('input[type=file]').data('inline-file-upload')

    it 'uploads multiple files', ->
      @ifu.options.start(filename: 'filename yo')
      @ifu.options.success(data: { file_id: 123 })
      expect($('.fr_add_file label').length).to.eql 1
      @ifu.options.start(filename: 'filename two')
      @ifu.options.success(data: { file_id: 456 })
      expect($('.fr_add_file label').length).to.eql 1
      expect(@fr.response_fields.models[0].get('value')).to.eql(
        [
          { id: 123, filename: 'filename yo' },
          { id: 456, filename: 'filename two' }
        ]
      )

      # And removes them...
      $('[data-fr-remove-file]').last().click()
      expect(@fr.response_fields.models[0].get('value')).to.eql(
        [
          { id: 123, filename: 'filename yo' }
        ]
      )
