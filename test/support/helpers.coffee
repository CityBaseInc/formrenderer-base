# Create `window.describe` etc. for our BDD-like tests.
mocha.setup ui: 'bdd'

# Create another global variable for simpler syntax.
window.expect = chai.expect

FormRenderer.prototype.defaults.screendoorBase = 'http://localhost'

window.labelToInput = (label) ->
  id = $("label:contains(\"#{label}\")").attr('for')
  $("##{id}")

window.fillIn = (label, value) ->
  labelToInput(label).val(value).trigger('input')

window.select = (label, value) ->
  labelToInput(label).val(value).trigger('change')

window.check = (label, value) ->
  $label = $("label:contains(\"#{label}\")")
  $input = $label.parent().find("label:contains(\"#{value}\")").find('input[type=checkbox]')
  $input.prop('checked', true).trigger('change')

window.uncheck = (label, value) ->
  $label = $("label:contains(\"#{label}\")")
  $input = $label.parent().find("label:contains(\"#{value}\")").find('input[type=checkbox]')
  $input.prop('checked', false).trigger('change')

window.choose = (label, value) ->
  $label = $("label:contains(\"#{label}\")")
  $label.find('input[type=radio]').click()

window.activePageNumber = ->
  parseInt($('.fr_pagination li span').text())
