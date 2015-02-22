# Create `window.describe` etc. for our BDD-like tests.
mocha.setup ui: 'bdd'

# Create another global variable for simpler syntax.
window.expect = chai.expect

FormRenderer.prototype.defaults.screendoorBase = 'http://localhost'

window.fillIn = (label, value) ->
  id = $("label:contains(\"#{label}\")").attr('for')
  $("##{id}").val(value).trigger('input')

window.select = (label, value) ->
  id = $("label:contains(\"#{label}\")").attr('for')
  $("##{id}").val(value).trigger('change')

window.check = (label, value) ->
  $label = $("label:contains(\"#{label}\")")
  $input = $label.parent().find("label:contains(\"#{value}\")").find('input[type=checkbox]')
  $input.attr('checked', true).trigger('change')

