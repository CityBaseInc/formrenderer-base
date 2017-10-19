FormRenderer.normalizeNumber = (value, units) ->
  returnVal = value.
                replace(/,/g, '').
                replace(/-/g, '').
                replace(/^\+/, '').
                trim()

  if units
    returnVal = returnVal.replace(new RegExp(units + '$', 'i'), '').trim()

  returnVal
