import { spawn } from 'node:child_process';
const children = [];
const start = (args, env = process.env) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env }); children.push(child);
  child.on('exit', code => { children.forEach(other => { if (other !== child) other.kill('SIGTERM'); }); process.exitCode = code ?? 0; });
};
start(['tools/codex-bridge/server.mjs']);
start(['scripts/run-framework.mjs', 'dev', '--port', '5185'], { ...process.env, TERRA_LOCAL_BRIDGE: '1' });
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => children.forEach(child => child.kill(signal)));
