import * as esbuild from 'esbuild';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function wasmBindgenPlugin(outDir) {
  return {
    name: 'wasm-bindgen',
    setup(build) {
      build.onResolve({ filter: /\.wasm$/ }, (args) => {
        const abs = path.isAbsolute(args.path) ? args.path : path.join(args.resolveDir, args.path);
        return { path: abs, namespace: 'wasm-bindgen' };
      });
      build.onLoad({ filter: /.*/, namespace: 'wasm-bindgen' }, async (args) => {
        const wasmPath = args.path;
        const wasmName = path.basename(wasmPath);
        await fs.mkdir(outDir, { recursive: true });
        await fs.copyFile(wasmPath, path.join(outDir, wasmName));
        const buf = await fs.readFile(wasmPath);
        const mod = new WebAssembly.Module(buf);
        const importModules = [...new Set(WebAssembly.Module.imports(mod).map((item) => item.module))];
        const importStmts = importModules
          .map((modName, i) => `import * as __wasmImports${i} from ${JSON.stringify(modName)};`)
          .join('\n');
        const importObj = importModules
          .map((modName, i) => `  ${JSON.stringify(modName)}: __wasmImports${i}`)
          .join(',\n');
        const exportNames = WebAssembly.Module.exports(mod)
          .map((item) => item.name)
          .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
        const named = exportNames.map((name) => `export const ${name} = __wasmExports.${name};`).join('\n');
        return {
          contents: `
${importStmts}
const __wasmResponse = await fetch(new URL(${JSON.stringify(`./${wasmName}`)}, import.meta.url));
if (!__wasmResponse.ok) {
  throw new Error('Failed to fetch ${wasmName}: ' + __wasmResponse.status);
}
const { instance: __wasmInstance } = await WebAssembly.instantiateStreaming(__wasmResponse, {
${importObj}
});
const __wasmExports = __wasmInstance.exports;
${named}
`,
          loader: 'js',
          resolveDir: path.dirname(wasmPath),
        };
      });
    },
  };
}

const outFile = path.join(root, 'apps/web/cohort-dapp.js');
const designerDappDir = path.join(root, 'web/public/dapp');

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, 'packages/dapp/src/browser.mjs')],
  outfile: outFile,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'none',
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.MIDNIGHT_NETWORK': '"preprod"',
    'process.env.MIDNIGHT_INDEXER_URL': '"https://indexer.preprod.midnight.network/api/v4/graphql"',
    'process.env.MIDNIGHT_INDEXER_WS_URL': '"wss://indexer.preprod.midnight.network/api/v4/graphql/ws"',
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
    wasmBindgenPlugin(path.dirname(outFile)),
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

await fs.mkdir(designerDappDir, { recursive: true });
await fs.copyFile(outFile, path.join(designerDappDir, 'cohort-dapp.js'));
const wasmNames = ['midnight_onchain_runtime_wasm_bg.wasm', 'midnight_ledger_wasm_bg.wasm'];
for (const name of wasmNames) {
  const src = path.join(path.dirname(outFile), name);
  try {
    await fs.copyFile(src, path.join(designerDappDir, name));
  } catch {
    /* wasm is emitted beside the stub bundle when the plugin resolves it */
  }
}
