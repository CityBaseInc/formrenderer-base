# Since we're sharing fixtures, this function is desgined to "mimic" the
# ResponseField#transformed_response_value method on the server.
transformRawValue = (key, value) ->
  switch key
    when 'radio'
      {
        selected: value
      }
    else
      value

describe 'ConditionChecker', ->
  describe 'values', ->
    it 'gets the text value for each response field', ->
      for key, field of Fixtures.Conditional.values
        for testValues in field.tests
          model = new FormRenderer.Models["ResponseField#{_.str.classify(key)}"](
            field.attrs || {}
          )
          model.setExistingValue transformRawValue(key, testValues.in)
          expect(model.toText()).to.eql(testValues.out)

  describe 'methods', ->
    beforeEach ->
      @fr = new FormRenderer Fixtures.FormRendererOptions.SHORT()

    it 'calculates', ->
      for method, deets of Fixtures.Conditional.methods
        conditional =
          method: method
          action: 'show'
          value: deets.value
          response_field_id: '35'

        checker = new FormRenderer.ConditionChecker(@fr, conditional)

        for x in deets.true
          checker.value = x
          expect(checker.isVisible()).to.eql(true)

        for x in deets.false
          checker.value = x
          expect(checker.isVisible()).to.eql(false)
