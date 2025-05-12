#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  stopCommand: () => stopCommand
});
module.exports = __toCommonJS(main_exports);
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
  const envRoutes = scanRoutes(path.join(process.env.CODER_HOME, "runtime"));
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
var BASE_DIR = process.env.CODER_HOME;
var SAMPLES_DIR = path2.join(BASE_DIR, "samples");
var TMP_DIR = path2.join(BASE_DIR, "tmp");
function copyDockerfileSync(src, dest) {
  if (!fs2.existsSync(dest)) fs2.mkdirSync(dest, { recursive: true });
  fs2.copyFileSync(src, path2.join(dest, "Dockerfile"));
}
async function createTempEnv(runtime) {
  const match = matchRoute(runtime);
  if (!match) return null;
  const { variables, dockerfilePath } = match;
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
var import_promises2 = __toESM(require("fs/promises"));
var import_path2 = __toESM(require("path"));

// src/init.ts
var import_promises = __toESM(require("fs/promises"));
var import_path = __toESM(require("path"));
async function initCommand() {
  const base = process.env.CODER_HOME;
  if (!base) {
    console.error(`
  [ERROR] La variable de entorno CODER_HOME no est\xE1 definida.
  
  Por favor, def\xEDnela antes de continuar. Ejemplo:
    export CODER_HOME=~/coder_home
  
  Puedes a\xF1adir esta l\xEDnea a tu .bashrc, .zshrc o archivo de configuraci\xF3n de tu terminal.
  `);
    process.exit(1);
  }
  try {
    await import_promises.default.mkdir(base, { recursive: true });
  } catch (err) {
    console.error(`[ERROR] No se pudo crear el directorio base: ${base}`);
    process.exit(1);
  }
  try {
    await import_promises.default.mkdir(import_path.default.join(base, "tmp"), { recursive: true });
  } catch (err) {
    console.error(`[ERROR] No se pudo crear el directorio tmp: ${import_path.default.join(base, "tmp")}`);
    process.exit(1);
  }
  const directories = [
    "runtime",
    "samples"
  ];
  for (const dir of directories) {
    const source = import_path.default.resolve(dir);
    const destination = import_path.default.join(process.env.CODER_HOME, dir);
    try {
      await import_promises.default.access(source);
      await copyDir(source, destination);
      console.log(`Copiado: ${dir} \u2192 ${destination}`);
    } catch (err) {
      console.warn(`[ADVERTENCIA] El directorio fuente "${dir}" no existe y no se ha copiado.`);
    }
  }
  console.log("\n\xA1Entorno inicializado correctamente en", base, "!");
}
async function copyDir(src, dest) {
  await import_promises.default.mkdir(dest, { recursive: true });
  const entries = await import_promises.default.readdir(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = import_path.default.join(src, entry.name);
    const destPath = import_path.default.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await import_promises.default.copyFile(srcPath, destPath);
    }
  }
}

// src/main.ts
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
  const port = await findAvailablePort();
  const envPath = import_path2.default.join(process.env.CODER_HOME, "tmp", container, ".env");
  (0, import_child_process.execSync)(`sed -i 's/^PORT=.*/PORT=${port}/' "${envPath}"`);
  return new Promise((resolve, reject) => {
    const tmpPath = import_path2.default.join(process.env.CODER_HOME, "tmp", container);
    const child = (0, import_child_process.spawn)("docker", ["compose", "start"], { cwd: tmpPath, stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`http://localhost:${port}`);
        resolve();
      } else {
        reject(new Error(`docker compose start exited with code ${code}`));
      }
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
}
async function deleteCommand(containerArg) {
  const container = containerArg || await promptContainer("eliminar");
  if (!container) return;
  const tmpPath = import_path2.default.join(process.env.CODER_HOME, "tmp", container);
  await new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)("docker", ["compose", "down", "-v"], { cwd: tmpPath, stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`docker compose down exited with code ${code}`));
      }
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
  console.log(`Borrando carpeta temporal: ${tmpPath}`);
  try {
    await import_promises2.default.rm(tmpPath, { recursive: true, force: true });
    console.log(`Carpeta temporal eliminada: ${tmpPath}`);
  } catch (err) {
    console.warn(`No se pudo borrar la carpeta temporal (${tmpPath}):`, JSON.stringify(err));
  }
}
async function stopCommand(containerArg) {
  let _path = containerArg || await promptContainer("detener");
  if (!_path) return;
  _path = import_path2.default.join(process.env.CODER_HOME, "tmp", _path);
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)("docker", ["compose", "stop"], { cwd: _path, stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`container parado`);
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
async function resolveAliasOrRuntime(runtime) {
  try {
    const data = await import_promises2.default.readFile(ALIAS_FILE, "utf8");
    const aliases = JSON.parse(data);
    return aliases[runtime] ?? runtime;
  } catch (e) {
    if (e.code === "ENOENT") return runtime;
    throw e;
  }
}
async function runCommand(runtime) {
  if (!runtime)
    return;
  const resolvedRuntime = await resolveAliasOrRuntime(runtime);
  const tempEnv = await createTempEnv(resolvedRuntime);
  if (!tempEnv) return;
  const { path: path5, port } = tempEnv;
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)("docker", ["compose", "up", "-d"], { cwd: path5, stdio: "inherit" });
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
var ALIAS_FILE = import_path2.default.join(process.env.CODER_HOME, "alias.json");
async function addAlias(name, value) {
  let aliases = {};
  try {
    await import_promises2.default.access(ALIAS_FILE);
    const data = await import_promises2.default.readFile(ALIAS_FILE, "utf8");
    aliases = JSON.parse(data);
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.error("Error leyendo alias.json:", e.message);
      process.exit(1);
    }
  }
  aliases[name] = value;
  await import_promises2.default.writeFile(ALIAS_FILE, JSON.stringify(aliases, null, 2));
  console.log(`Alias a\xF1adido: ${name} \u2192 ${value}`);
}
(0, import_yargs.default)((0, import_helpers.hideBin)(process.argv)).scriptName("coder").command(
  "init",
  "Inicializa el entorno de coder en CODER_HOME",
  () => {
  },
  async () => {
    await initCommand();
  }
).command(
  "alias <name> <value>",
  "Crea un alias",
  (yargs2) => {
    yargs2.positional("name", {
      describe: "Nombre del alias",
      type: "string"
    }).positional("value", {
      describe: "Valor del alias",
      type: "string"
    });
  },
  async (argv) => {
    const arg = argv;
    await addAlias(arg.name, arg.value);
  }
).command("run [runtime]", "Lanza un runtime", (yargs2) => yargs2.positional("runtime", {
  type: "string",
  describe: "Ejemplo: node:18"
}), async (argv) => {
  await runCommand(argv.runtime);
}).command("stop [container]", "Para un runtime", (yargs2) => yargs2.positional("container", {
  type: "string",
  describe: "Container"
}), async (argv) => {
  await stopCommand(argv.container);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  stopCommand
});
//# sourceMappingURL=main.js.map