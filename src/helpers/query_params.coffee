FormRenderer.queryParams = (value) ->
  value.substring(1).split('&')
    .filter((value) -> value != '')
    .reduce ((params, entry) ->
      entry = entry.split('=')
      if entry.length == 2
        params[entry[0]] = entry[1]
      params
    ), {}
