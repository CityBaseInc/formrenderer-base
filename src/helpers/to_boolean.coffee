FormRenderer.toBoolean = (str) ->
  _.contains ['True', 'Yes', 'true', '1', 1, 'yes', true], str
