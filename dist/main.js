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

// src/match.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
function scanRoutes(baseDir, prefix = "") {
  const routes = [];
  function walk(currentPath, parts) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(currentPath, entry.name), [...parts, entry.name]);
      } else if (entry.isFile() && entry.name === "Dockerfile") {
        const template = parts.join("/");
        const variables = [];
        const patternStr = parts.map((part) => {
          const match = part.match(/^\[(.+)\]$/);
          if (match) {
            variables.push(match[1]);
            return "([^/]+)";
          }
          return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }).join("/");
        const pattern = new RegExp(`^${patternStr}$`);
        routes.push({
          pattern,
          variables,
          dockerfilePath: path.join(currentPath, entry.name),
          template
        });
      }
    }
  }
  walk(baseDir, prefix ? [prefix] : []);
  return routes;
}
function matchRoute(input) {
  const [route, queryString] = input.split("?");
  const params = new URLSearchParams(queryString);
  const envRoutes = scanRoutes(path.join(process.cwd(), "runtime"));
  const routes = [...envRoutes];
  for (const r of routes) {
    const m = route.match(r.pattern);
    if (m) {
      const p = {};
      r.variables.forEach((v, i) => {
        p[v] = m[i + 1];
      });
      return {
        ...r,
        variables: p,
        variableNames: r.variables,
        params
      };
    }
  }
  return null;
}

// src/utils.ts
var fs2 = require("fs");
var path2 = require("path");
var { detect } = require("detect-port");
var BASE_DIR = process.cwd();
var RUNTIME_DIR = path2.join(BASE_DIR, "runtime");
var SAMPLES_DIR = path2.join(BASE_DIR, "samples");
var TMP_DIR = path2.join(BASE_DIR, "tmp");
function copyDockerfileSync(src, dest) {
  if (!fs2.existsSync(dest)) fs2.mkdirSync(dest, { recursive: true });
  fs2.copyFileSync(src, path2.join(dest, "Dockerfile"));
}
async function createTempEnv(runtime) {
  const { variables, dockerfilePath } = matchRoute(runtime);
  if (!fs2.existsSync(TMP_DIR)) fs2.mkdirSync(TMP_DIR);
  const safeRuntime = runtime.replace(/[^a-zA-Z0-9-_]/g, "-");
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const tempFolder = `${safeRuntime}-${timestamp}`;
  const containerName = tempFolder;
  const tempPath = path2.join(TMP_DIR, tempFolder);
  const port = await findAvailablePort(8080);
  fs2.mkdirSync(tempPath);
  copyDockerfileSync(dockerfilePath, tempPath);
  const composeSrc = path2.join(SAMPLES_DIR, "docker-compose.yml");
  const composeDest = path2.join(tempPath, "docker-compose.yml");
  fs2.copyFileSync(composeSrc, composeDest);
  const env = Object.entries(variables).map(([k, v]) => `${k.toUpperCase()}=${v}`);
  console.log(env);
  const envContent = [
    ...env,
    `CODE_PORT=${port}`,
    `CONTAINER_NAME=${containerName}`
  ].join("\n");
  fs2.writeFileSync(path2.join(tempPath, ".env"), envContent);
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
var import_promises = __toESM(require("fs/promises"));
var import_path = __toESM(require("path"));
var execAsync = (0, import_util.promisify)(import_child_process2.exec);
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
async function openCommand(containerArg) {
  const container = containerArg || await promptContainer("abrir");
  if (!container) return;
  (0, import_child_process.execSync)(`docker start ${container}`, { stdio: "inherit" });
}
async function deleteCommand(containerArg) {
  const container = containerArg || await promptContainer("eliminar");
  if (!container) return;
  (0, import_child_process.execSync)(`docker rm -f ${container}`, { stdio: "inherit" });
  const tmpPath = import_path.default.join(process.cwd(), "tmp", container);
  console.log(`Borrando carpeta temporal: ${tmpPath}`);
  try {
    await import_promises.default.rm(tmpPath, { recursive: true, force: true });
    console.log(`Carpeta temporal eliminada: ${tmpPath}`);
  } catch (err) {
    console.warn(`No se pudo borrar la carpeta temporal (${tmpPath}):`, err.message);
  }
}
async function runCommand(runtime) {
  const { path: path4, port } = await createTempEnv(runtime);
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)("docker", ["compose", "up", "-d"], { cwd: path4, stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`http://localhost:${port}`);
        resolve();
      } else {
        reject(new Error(`docker compose exited with code ${code}`));
      }
    });
    child.on("error", (err) => {
      console.error("Error al ejecutar docker compose:", err);
      reject(err);
    });
  });
}
(0, import_yargs.default)((0, import_helpers.hideBin)(process.argv)).scriptName("coder").command("run [runtime]", "Lanza un runtime", (yargs2) => yargs2.positional("runtime", {
  type: "string",
  describe: "Ejemplo: node:18"
}), async (argv) => {
  await runCommand(argv.runtime);
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