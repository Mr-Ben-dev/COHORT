import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const ZK_ARTIFACTS_DIR = path.join(root, 'packages/contract/zk');

export function zkDir() {
  return ZK_ARTIFACTS_DIR;
}

export function zkArtifactPaths() {
  return {
    dir: ZK_ARTIFACTS_DIR,
    prover: path.join(ZK_ARTIFACTS_DIR, 'keys', 'proveEligible.prover'),
    verifier: path.join(ZK_ARTIFACTS_DIR, 'keys', 'proveEligible.verifier'),
    bzkir: path.join(ZK_ARTIFACTS_DIR, 'zkir', 'proveEligible.bzkir'),
    zkir: path.join(ZK_ARTIFACTS_DIR, 'zkir', 'proveEligible.zkir'),
    compilerInfo: path.join(ZK_ARTIFACTS_DIR, 'compiler', 'contract-info.json'),
  };
}

export function zkArtifactsPresent() {
  const p = zkArtifactPaths();
  return (
    fs.existsSync(p.prover) &&
    fs.existsSync(p.verifier) &&
    fs.existsSync(p.bzkir) &&
    fs.statSync(p.prover).isFile() &&
    fs.statSync(p.prover).size > 1_000_000
  );
}
