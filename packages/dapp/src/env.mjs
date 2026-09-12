/** Browser-safe env read. Never required for Preprod defaults. */
export function env(name, fallback = '') {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name];
    }
  } catch {
    // ignore
  }
  return fallback;
}
