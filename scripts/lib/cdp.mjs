// Minimal Chrome DevTools Protocol client (no dependencies; Node >= 22 has WebSocket).
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export async function launch({ port = 9333, headless = true } = {}) {
  // One persistent profile per port, so model downloads are cached and temp space does not grow.
  const profile = path.join(os.homedir(), 'AppData/Local/Temp/claude-cdp-profiles', 'p' + port);
  fs.mkdirSync(profile, { recursive: true });
  const args = [
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--disable-features=Translate', '--autoplay-policy=no-user-gesture-required',
    ...(headless ? ['--headless=new'] : []), 'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await new Promise(r => setTimeout(r, 200)); }
  }
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const waiters = new Map();
  const listeners = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiters.has(msg.id)) {
      const { resolve, reject } = waiters.get(msg.id);
      waiters.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) listeners.forEach(l => l(msg));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id;
    waiters.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const once = (method) => new Promise(res => { const l = (m) => { if (m.method === method) { listeners.splice(listeners.indexOf(l), 1); res(m.params); } }; listeners.push(l); });
  await send('Page.enable');
  await send('Runtime.enable');

  const api = {
    send,
    async viewport(width, height, scale = 1, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
    },
    async goto(url, waitMs = 0) {
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url });
      await loaded;
      if (waitMs) await new Promise(r => setTimeout(r, waitMs));
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async addScriptOnLoad(source) {
      await send('Page.addScriptToEvaluateOnNewDocument', { source });
    },
    async screenshot(file, { fullPage = false, clip, format = 'png', quality } = {}) {
      const params = { format, captureBeyondViewport: fullPage };
      if (quality) params.quality = quality;
      if (fullPage) {
        const { cssContentSize } = await send('Page.getLayoutMetrics');
        params.clip = { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 };
      } else if (clip) params.clip = { scale: 1, ...clip };
      const { data } = await send('Page.captureScreenshot', params);
      const buf = Buffer.from(data, 'base64');
      if (file) fs.writeFileSync(file, buf);
      return buf;
    },
    async close() { try { await send('Browser.close'); } catch {} ws.close(); proc.kill(); },
  };
  return api;
}
