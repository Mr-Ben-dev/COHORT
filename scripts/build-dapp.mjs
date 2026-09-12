import * as esbuild from 'esbuild';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, 'packages/dapp/src/browser.mjs')],
  outfile: path.join(root, 'apps/web/cohort-dapp.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'info',
  loader: { '.wasm': 'file' },
  assetNames: '[name]',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.MIDNIGHT_NETWORK': '"preprod"',
    'process.env.MIDNIGHT_INDEXER_URL': '"https://indexer.preprod.midnight.network/api/v4/graphql"',
    'process.env.MIDNIGHT_INDEXER_WS_URL': '"wss://indexer.preprod.midnight.network/api/v4/graphql/ws"',
    global: 'globalThis',
  },
  plugins: [
    polyfillNode({
      polyfills: {
        fs: false,
        child_process: false,
        os: false,
        cluster: false,
        worker_threads: false,
      },
    }),
    {
      name: 'external-node-only',
      setup(build) {
        build.onResolve({ filter: /[\\/]zk-fs\.mjs$/ }, () => ({
          path: 'cohort:zk-fs',
          namespace: 'cohort-empty',
        }));
        build.onResolve({ filter: /midnight-js-node-zk-config-provider/ }, () => ({
          path: 'cohort:node-zk',
          namespace: 'cohort-empty',
        }));
        build.onResolve({ filter: /apps[\\/]api[\\/]src[\\/]trials\.mjs$/ }, () => ({
          path: 'cohort:api-trials',
          namespace: 'cohort-empty',
        }));
        build.onLoad({ filter: /.*/, namespace: 'cohort-empty' }, () => ({
          contents: 'export default {};\n',
          loader: 'js',
        }));
      },
    },
  ],
});
