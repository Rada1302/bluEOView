module.exports = function override(config, env) {
  // Disables the strict "Attempted import error" from completely breaking your production build
  if (config.module && config.module.rules) {
    config.module.strictExportPresence = false;
  }
  return config;
};
