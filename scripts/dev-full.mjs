import { spawn } from "node:child_process";

const webPort = process.env.VOICEDRAW_WEB_PORT || "5177";
const apiPort = process.env.PORT || process.env.VOICEDRAW_API_PORT || "8788";
const baseEnv = {
  ...process.env,
  PORT: apiPort,
  VITE_API_TARGET: `http://127.0.0.1:${apiPort}`,
};

const commands = [
  ["api", "npx", ["tsx", "watch", "server/index.ts"]],
  ["web", "npx", ["vite", "--host", "127.0.0.1", "--port", webPort, "--strictPort"]],
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: "pipe",
    shell: true,
    env: baseEnv,
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });
  return child;
});

console.log(`VoiceDraw web target: http://127.0.0.1:${webPort}`);
console.log(`VoiceDraw API target: http://127.0.0.1:${apiPort}`);

process.on("SIGINT", () => {
  for (const child of children) {
    child.kill("SIGINT");
  }
  process.exit(0);
});
