FormRenderer.getLength = (wordsOrChars, val) ->
  trimmed = _str.trim(val)

  if wordsOrChars == 'words'
    (trimmed.replace(/['";:,.?¿\-!¡]+/g, '').match(/\S+/g) || '').length
  else
    trimmed.length
