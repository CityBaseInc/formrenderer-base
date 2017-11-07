ALLOWED_TAGS = [
    'a',
    'p',
    'br',
    'b',
    'strong',
    'em',
    'i'
  ]

ALLOWED_ATTRIBUTES = [
    'href',
    'target'
  ]

autoLink = (str) ->
  pattern = ///
    (^|[\s\n]|<br\/?>) # Capture the beginning of string or line or leading whitespace
    (
      (?:https?|ftp):// # Look for a valid URL protocol (non-captured)
      [\-A-Z0-9+\u0026\u2019@#/%?=()~_|!:,.;]* # Valid URL characters (any number of times)
      [\-A-Z0-9+\u0026@#/%=~()_|] # String must end in a valid URL character
    )
  ///gi

  str.replace(pattern, "$1<a href='$2' target='_blank'>$2</a>")

simpleFormat = (str = '') ->
  "#{str}".replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br />' + '$2')

sanitize = (str) ->
  DOMPurify.sanitize(str, { ALLOWED_TAGS: ALLOWED_TAGS, ALLOWED_ATTR: ALLOWED_ATTRIBUTES })

FormRenderer.formatAndSanitizeHTML = (unsafeHTML) ->
  sanitize(
    autoLink(
      simpleFormat(unsafeHTML)
    )
  )

