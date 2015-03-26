describe 'response field views', ->
  it 'can be rendered without a form_renderer instance', ->
    for field_type in FormRenderer.FIELD_TYPES
      model = new FormRenderer.Models["ResponseField#{_.str.classify(field_type)}"]

      view = new FormRenderer.Views["ResponseField#{_.str.classify(field_type)}"](
        model: model
      )

      expect(view.render()).to.be.ok
