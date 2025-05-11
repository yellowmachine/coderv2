#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var import_yargs = __toESM(require("yargs"));
var import_helpers = require("yargs/helpers");
var import_prompts = __toESM(require("prompts"));
var import_child_process = require("child_process");

// src/utils.ts
var fs = require("fs");
var path = require("path");
var { detect } = require("detect-port");
var BASE_DIR = process.cwd();
var RUNTIME_DIR = path.join(BASE_DIR, "runtime");
var SAMPLES_DIR = path.join(BASE_DIR, "samples");
var TMP_DIR = path.join(BASE_DIR, "tmp");
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}
async function createTempEnv(runtime) {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
  const safeRuntime = runtime.replace(/[^a-zA-Z0-9-_]/g, "-");
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const tempFolder = `${safeRuntime}-${timestamp}`;
  const tempPath = path.join(TMP_DIR, tempFolder);
  const port = await findAvailablePort(8080);
  fs.mkdirSync(tempPath);
  const runtimeSrc = path.join(RUNTIME_DIR, runtime);
  copyDirSync(runtimeSrc, tempPath);
  const composeSrc = path.join(SAMPLES_DIR, "docker-compose.yml");
  const composeDest = path.join(tempPath, "docker-compose.yml");
  fs.copyFileSync(composeSrc, composeDest);
  const envContent = [
    //`GIT_REPO=${repo.ssh_url}`,
    //`GIT_BRANCH=${branch}`
    `CODE_PORT=${port}`
  ].join("\n");
  fs.writeFileSync(path.join(tempPath, ".env"), envContent);
  return { path: tempPath, port };
}
async function findAvailablePort(startPort = 8080) {
  const port = await detect(startPort);
  if (port === startPort) {
    console.log(`El puerto ${startPort} est\xE1 libre`);
  } else {
    console.log(`El puerto ${startPort} est\xE1 ocupado, el siguiente libre es ${port}`);
  }
  return port;
}

// src/main.ts
var import_child_process2 = require("child_process");
var import_util = require("util");
var execAsync = (0, import_util.promisify)(import_child_process2.exec);
async function promptRepo() {
  const res = await (0, import_prompts.default)({
    type: "text",
    name: "repo",
    message: "Introduce usuario/repo de GitHub:"
  });
  return res.repo;
}
async function fetchUserRepos() {
  if (!octokit) throw new Error("GITHUB_TOKEN no definido");
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, { per_page: 100 });
  return repos.map((repo) => ({
    title: repo.full_name + (repo.private ? " (privado)" : ""),
    value: repo.ssh_url
  }));
}
async function promptUserRepo() {
  const repos = await fetchUserRepos();
  const res = await (0, import_prompts.default)({
    type: "autocomplete",
    name: "repo",
    message: "Selecciona un repo:",
    choices: repos
  });
  return res.repo;
}
async function promptContainer(action = "abrir") {
  const containers = (0, import_child_process.execSync)('docker ps -a --format "{{.Names}}"').toString().split("\n").filter(Boolean);
  if (containers.length === 0) {
    console.log("No hay contenedores disponibles.");
    process.exit(0);
  }
  const res = await (0, import_prompts.default)({
    type: "select",
    name: "container",
    message: `Selecciona un contenedor para ${action}:`,
    choices: containers.map((name) => ({ title: name, value: name }))
  });
  return res.container;
}
async function createCommand(repoArg) {
  const repo = repoArg || await promptRepo();
  if (!repo) return;
  (0, import_child_process.execSync)(`npx degit ${repo}`, { stdio: "inherit" });
}
async function cloneCommand() {
  const repo = await promptUserRepo();
  if (!repo) return;
  (0, import_child_process.execSync)(`git clone ${repo}`, { stdio: "inherit" });
}
async function openCommand(containerArg) {
  const container = containerArg || await promptContainer("abrir");
  if (!container) return;
  (0, import_child_process.execSync)(`docker start ${container}`, { stdio: "inherit" });
}
async function deleteCommand(containerArg) {
  const container = containerArg || await promptContainer("eliminar");
  if (!container) return;
  (0, import_child_process.execSync)(`docker rm -f ${container}`, { stdio: "inherit" });
}
async function runCommand(runtime) {
  const { path: path2, port } = await createTempEnv(runtime);
  try {
    const { stdout, stderr } = await execAsync("docker compose up -d", { cwd: path2 });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`http://localhost:${port}`);
  } catch (error) {
    console.error("Error al ejecutar docker compose:", error);
    throw error;
  }
}
(0, import_yargs.default)((0, import_helpers.hideBin)(process.argv)).scriptName("coder").command("run [runtime]", "Lanza un runtime", (yargs2) => yargs2.positional("runtime", {
  type: "string",
  describe: "Ejemplo: node:18"
}), async (argv) => {
  await runCommand(argv.runtime);
}).command("create [repo]", "Crea entorno desde repo", (yargs2) => yargs2.positional("repo", {
  type: "string",
  describe: "Usuario/repo de GitHub"
}), async (argv) => {
  await createCommand(argv.repo);
}).command("clone", "Clona un repo tuyo", {}, async () => {
  await cloneCommand();
}).command("open [container]", "Abre un contenedor existente", (yargs2) => yargs2.positional("container", {
  type: "string",
  describe: "Container"
}), async (argv) => {
  await openCommand(argv.container);
}).command("delete [container]", "Elimina un contenedor", (yargs2) => yargs2.positional("container", {
  type: "string",
  describe: "Container"
}), async (argv) => {
  await deleteCommand(argv.container);
}).demandCommand(1, 1, "Debes especificar un comando (create, clone, open, delete)").help().argv;
//# sourceMappingURL=main.js.map