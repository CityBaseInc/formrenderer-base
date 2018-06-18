ALL_FIELD_TYPES = [
  'identification'
  'address'
  'checkboxes'
  'date'
  'dropdown'
  'email'
  'file'
  'number'
  'paragraph'
  'phone'
  'price'
  'radio'
  'table'
  'text'
  'time'
  'website'
  'map_marker'
  'confirm'
  'block_of_text'
  'page_break'
  'section_break'
]

describe 'response field views', ->
  it 'can be rendered without a form_renderer instance', ->
    for field_type in ALL_FIELD_TYPES
      model = new FormRenderer.Models["ResponseField#{_.str.classify(field_type)}"]
      viewKlass = FormRenderer.formComponentViewClass(model)
      view = new viewKlass(model: model)
      expect(view.render()).to.be.ok

describe 'FormRenderer.Views.ResponseFieldIdentification', ->
  # #makeStatic is used internally by Screendoor's Formbuilder
  describe '#makeStatic', ->
    it 'does not render input fields when called', ->
      idView = new FormRenderer.Views.ResponseFieldIdentification(
        model: new FormRenderer.Models.ResponseFieldIdentification
      )

      idView.disableInput()

      $('body').append(idView.render().$el)

      $idenField = $('.fr_response_field_identification')

      # identification field should render
      expect($idenField.length).to.eql(1)

      # no inputs should be rendered
      expect($idenField.find('input').length).to.eql(0)


  context 'Follow-up forms', ->
    beforeEach ->
      $('body').html('<div data-formrenderer />')
      new FormRenderer Fixtures.FormRendererOptions.FOLLOW_UP_FORM()
      @$iden_field = $('.fr_response_field_identification')

    it 'does not render input fields', ->
      # identification field should render
      expect(@$iden_field.length).to.eql 1

      # no inputs should be rendered
      expect(@$iden_field.find('input').length).to.eql(0)

    it "renders the respondent's name and email", ->
      # $iden_field
      expect(@$iden_field.text()).to.include('Bilbo')
      expect(@$iden_field.text()).to.include('bilbo@shire.net')

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
      expect(@fr.formComponents.models[0].get('value')).to.eql(
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
      expect(@fr.formComponents.models[0].get('value')).to.eql(
        [
          { id: 123, filename: 'filename yo' },
          { id: 456, filename: 'filename two' }
        ]
      )

      # And removes them...
      $('[data-fr-remove-file]').last().click()
      expect(@fr.formComponents.models[0].get('value')).to.eql(
        [
          { id: 123, filename: 'filename yo' }
        ]
      )
