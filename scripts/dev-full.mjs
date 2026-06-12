import { spawn } from "node:child_process";

const commands = [
  ["api", "npx", ["tsx", "watch", "server/index.ts"]],
  ["web", "npx", ["vite", "--host", "127.0.0.1"]],
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: "pipe",
    shell: true,
    env: process.env,
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

process.on("SIGINT", () => {
  for (const child of children) {
    child.kill("SIGINT");
  }
  process.exit(0);
});
