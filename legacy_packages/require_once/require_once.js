window.requireOnce = function (a, b) {
  return "undefined" == typeof scripts[a]
    ? ((scripts[a] = []),
      null != b && scripts[a].push(b),
      $.getScript(a, function () {
        var c, d, e;
        for (e = scripts[a], c = 0, d = e.length; d > c; c++) (b = e[c]), b();
        return (scripts[a] = !0);
      }))
    : scripts[a] === !0
    ? "function" == typeof b
      ? b()
      : void 0
    : null != b
    ? scripts[a].push(b)
    : void 0;
};
