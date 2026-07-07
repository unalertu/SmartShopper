module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    env: {
      production: {
        // Strip console.* from release builds — the map path logs on every
        // Overpass fetch, cache operation and region change, which costs JS
        // thread time exactly when the map is busiest. error/warn are kept
        // for crash reporting.
        plugins: [["transform-remove-console", { exclude: ["error", "warn"] }]],
      },
    },
  };
};
