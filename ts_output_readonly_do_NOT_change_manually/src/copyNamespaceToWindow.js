// Copy everything on gamingPlatform to window,
// for backward compatability with games that don't use the gamingPlatform namespace.
(function () {
    var w = window;
    var g = gamingPlatform;
    for (var key in g) {
        w[key] = g[key];
    }
})();
