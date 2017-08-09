## Ensure jQuery isn't in noConflict mode

$ = jQuery

# Alias underscore.string in case underscore gets overriden...

_str = _.str

## Rivets

rivets.inputEvent = if document.addEventListener then 'input' else 'keyup'

rivets.binders.input =
  publishes: true
  routine: rivets.binders.value.routine
  bind: (el) ->
    $(el).bind("#{rivets.inputEvent}.rivets", this.publish)
  unbind: (el) ->
    $(el).unbind("#{rivets.inputEvent}.rivets")

rivets.formatters.eq = (value, checkAgainst) ->
  if value.constructor == Array
    checkAgainst in value
  else
    value == checkAgainst

rivets.binders.checkedarray =
  publishes: true

  routine: (el, value) ->
    el.checked = _.contains(value, el.value)

  bind: (el) ->
    $(el).bind 'change.rivets', =>
      val = @model.get(@keypath) || []

      newVal = if el.checked
                  _.uniq(val.concat(el.value))
                else
                  _.without(val, el.value)

      @model.set @keypath, newVal

  unbind: (el) ->
    $(el).unbind('change.rivets')


rivets.binders.dobtradio =
  publishes: true

  routine: (el, value) ->
    el.checked = _.contains(value, el.value)

  bind: (el) ->
    $(el).bind 'change.rivets', =>
      @model.set @keypath, [el.value]

      if $(el).hasClass('other-option') and $(el).is(':checked')
        @model.set 'value.other_checked', true
      else
        @model.set 'value.other_checked', false

  unbind: (el) ->
    $(el).unbind('change.rivets')

rivets.configure
  prefix: "rv"
  adapter:
    subscribe: (obj, keypath, callback) ->
      callback.wrapped = (m, v) -> callback(v)
      obj.on('change:' + keypath, callback.wrapped)

    unsubscribe: (obj, keypath, callback) ->
      obj.off('change:' + keypath, callback.wrapped)

    read: (obj, keypath) ->
      if keypath is "cid" then return obj.cid
      obj.get(keypath)

    publish: (obj, keypath, value) ->
      if obj.cid
        obj.set(keypath, value);
      else
        obj[keypath] = value
