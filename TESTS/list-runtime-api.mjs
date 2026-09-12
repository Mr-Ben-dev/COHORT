import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const RT = require('@midnight-ntwrk/compact-runtime');
console.log(Object.keys(RT).sort().join('\n'));
