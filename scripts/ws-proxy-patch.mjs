/**
 * WebSocket proxy patch for COHORT deployer.
 * Ported from REMIT's scripts/lib/operator-wallet.ts.
 *
 * The wallet SDK opens graphql-ws subscriptions with the global WebSocket
 * (the `ws` package), which does not honor HTTPS_PROXY. This VM has no direct
 * egress — everything goes through the runtime egress proxy — so raw `ws`
 * connections fail at the TLS handshake. This patch installs a subclass that
 * tunnels wss:// through the proxy with an HTTP CONNECT tunnel.
 *
 * Import this FIRST, before any wallet SDK imports:
 *   import './ws-proxy-patch.mjs';
 */
import { WebSocket } from 'ws';
import { connect as netConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import { Agent as HttpsAgent } from 'node:https';

function egressProxyUrl() {
  const raw =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.ALL_PROXY || process.env.all_proxy;
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function proxyBypassed(hostname) {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  if (!noProxy) return false;
  const host = hostname.toLowerCase();
  return noProxy
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => {
      const e = entry.startsWith('.') ? entry.slice(1) : entry;
      return host === e || host.endsWith(`.${e}`);
    });
}

/** https.Agent whose sockets are TLS-over-HTTP-CONNECT through the egress proxy. */
function proxyTunnelAgent() {
  const proxy = egressProxyUrl();
  if (!proxy) throw new Error('proxyTunnelAgent without proxy');
  const proxyHost = proxy.hostname;
  const proxyPort = Number(proxy.port) || 3128;
  const auth = proxy.username
    ? `Proxy-Authorization: Basic ${Buffer.from(
        `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`,
      ).toString('base64')}\r\n`
    : '';
  const agent = new HttpsAgent({ keepAlive: false });
  agent.createConnection = (options, oncreate) => {
    const targetHost = options.hostname || options.host;
    if (!targetHost) {
      oncreate(new Error('proxy tunnel: no target host'));
      return undefined;
    }
    if (proxyBypassed(targetHost)) {
      const direct = tlsConnect({ host: targetHost, port: 443, servername: targetHost });
      direct.on('secureConnect', () => oncreate(null, direct));
      direct.on('error', (e) => oncreate(e));
      return direct;
    }
    const sock = netConnect({ host: proxyHost, port: proxyPort });
    let head = '';
    const onData = (chunk) => {
      head += chunk.toString('latin1');
      if (!head.includes('\r\n\r\n')) return;
      sock.removeListener('data', onData);
      if (!/^HTTP\/1\.[01] 200/.test(head)) {
        oncreate(new Error(`proxy CONNECT failed: ${head.split('\r\n')[0]}`));
        sock.destroy();
        return;
      }
      const tlsSock = tlsConnect({
        socket: sock,
        host: targetHost,
        port: 443,
        servername: targetHost,
      });
      tlsSock.on('secureConnect', () => oncreate(null, tlsSock));
      tlsSock.on('error', (e) => oncreate(e));
    };
    sock.on('data', onData);
    sock.on('error', (e) => oncreate(e));
    sock.write(`CONNECT ${targetHost}:443 HTTP/1.1\r\nHost: ${targetHost}:443\r\n${auth}\r\n`);
    return sock;
  };
  return agent;
}

class ProxyTunnelWebSocket extends WebSocket {
  constructor(url, protocols) {
    if (!egressProxyUrl()) {
      super(url, protocols);
      return;
    }
    super(url, protocols, { agent: proxyTunnelAgent() });
  }
}

if (egressProxyUrl()) {
  globalThis.WebSocket = ProxyTunnelWebSocket;
  console.error('[ws-proxy-patch] globalThis.WebSocket patched for egress proxy tunneling');
} else {
  console.error('[ws-proxy-patch] no proxy configured, using raw WebSocket');
}
