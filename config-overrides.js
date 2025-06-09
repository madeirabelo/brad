module.exports = function override(config, env) { config.ignoreWarnings = [{ module: /node_modules\/d3/, message: /The `util\._extend` API is deprecated/, }]; return config; };
