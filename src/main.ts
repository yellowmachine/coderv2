#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import prompts from 'prompts';
import { execSync, spawn } from 'child_process';
import { createTempEnv, findAvailablePort } from './utils';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { initCommand } from './init';


const execAsync = promisify(exec);

async function promptCommand() {
  const res = await prompts({
    type: 'select',
    name: 'command',
    message: '¿Qué quieres hacer?',
    choices: [
      { title: 'Crear entorno desde repo (create)', value: 'create' },
      { title: 'Clonar un repo tuyo (clone)', value: 'clone' },
      { title: 'Abrir contenedor existente (open)', value: 'open' },
      { title: 'Eliminar contenedor (delete)', value: 'delete' }
    ]
  });
  return res.command;
}

async function promptContainer(action = 'abrir') {
  const containers = execSync('docker ps -a --format "{{.Names}}"').toString().split('\n').filter(Boolean);
  if (containers.length === 0) {
    console.log('No hay contenedores disponibles.');
    process.exit(0);
  }
  const res = await prompts({
    type: 'select',
    name: 'container',
    message: `Selecciona un contenedor para ${action}:`,
    choices: containers.map(name => ({ title: name, value: name }))
  });
  return res.container;
}

// ===== COMANDOS =====

async function openCommand(containerArg?: string) {
  const container = containerArg || await promptContainer('abrir');
  if (!container) return;
  
  const port = await findAvailablePort();
  const envPath = path.join(process.env.CODER_HOME!, 'tmp', container, '.env');

  execSync(`sed -i 's/^PORT=.*/PORT=${port}/' "${envPath}"`);
  
  return new Promise<void>((resolve, reject) => {
    const tmpPath = path.join(process.env.CODER_HOME!, 'tmp', container);
    const child = spawn('docker', ['compose', 'start'], { cwd: tmpPath, stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`http://localhost:${port}`);
        resolve();
      } else {
        reject(new Error(`docker compose start exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });

}

async function deleteCommand(containerArg?: string) {
  const container = containerArg || await promptContainer('eliminar');
  if (!container) return;

  const tmpPath = path.join(process.env.CODER_HOME!, 'tmp', container);

  // Ejecutar docker compose down -v en la carpeta del entorno
  await new Promise<void>((resolve, reject) => {
    const child = spawn('docker', ['compose', 'down', '-v'], { cwd: tmpPath, stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`docker compose down exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });

  // Eliminar la carpeta temporal
  console.log(`Borrando carpeta temporal: ${tmpPath}`);
  try {
    await fs.rm(tmpPath, { recursive: true, force: true });
    console.log(`Carpeta temporal eliminada: ${tmpPath}`);
  } catch (err) {
    console.warn(`No se pudo borrar la carpeta temporal (${tmpPath}):`, JSON.stringify(err));
  }
}


export async function stopCommand(containerArg?: string) {
  let _path = containerArg || await promptContainer('detener');
  if (!_path) return;

  _path = path.join(process.env.CODER_HOME!, 'tmp', _path);

  return new Promise<void>((resolve, reject) => {
    const child = spawn('docker', ['compose', 'stop'], { cwd: _path, stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`container parado`);
        resolve();
      } else {
        reject(new Error(`docker compose exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error('Error al ejecutar docker compose:', err);
      reject(err);
    });
  });
}

async function resolveAliasOrRuntime(runtime: string): Promise<string> {
  try {
    const data = await fs.readFile(ALIAS_FILE, 'utf8');
    const aliases = JSON.parse(data) as Record<string, string>;
    // Si existe el alias, lo sustituye; si no, devuelve el runtime original
    return aliases[runtime] ?? runtime;
  } catch (e: any) {
    // Si el archivo no existe, simplemente devuelve el runtime original
    if (e.code === 'ENOENT') return runtime;
    throw e; // Otros errores sí deben reportarse
  }
}

async function runCommand(runtime?: string) {
  if(!runtime) 
    return;
  const resolvedRuntime = await resolveAliasOrRuntime(runtime);
  
  const tempEnv = await createTempEnv(resolvedRuntime);
  if(!tempEnv) return;
  const { path, port } = tempEnv;

  return new Promise<void>((resolve, reject) => {
    const child = spawn('docker', ['compose', 'up', '-d'], { cwd: path, stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`http://localhost:${port}`);
        resolve();
      } else {
        reject(new Error(`docker compose exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error('Error al ejecutar docker compose:', err);
      reject(err);
    });
  });
}

const ALIAS_FILE = path.join(process.env.CODER_HOME!, 'alias.json');

async function addAlias(name: string, value: string) {
  let aliases: Record<string, string> = {};

  try {
    await fs.access(ALIAS_FILE);
    // Solo si existe, intenta leer y parsear
    const data = await fs.readFile(ALIAS_FILE, 'utf8');
    aliases = JSON.parse(data);
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      // Error distinto a "no existe el archivo"
      console.error('Error leyendo alias.json:', e.message);
      process.exit(1);
    }
  }

  aliases[name] = value;
  await fs.writeFile(ALIAS_FILE, JSON.stringify(aliases, null, 2));
  console.log(`Alias añadido: ${name} → ${value}`);
}

// ===== YARGS INTEGRACIÓN =====

yargs(hideBin(process.argv))
  .scriptName('coder')
  .command(
    'init',
    'Inicializa el entorno de coder en CODER_HOME',
    () => {},
    async () => {
      await initCommand();
    }
  )
  .command(
    'alias <name> <value>',
    'Crea un alias',
    (yargs) => {
      yargs
        .positional('name', {
          describe: 'Nombre del alias',
          type: 'string',
        })
        .positional('value', {
          describe: 'Valor del alias',
          type: 'string',
        });
    },
    async (argv) => {
      const arg = argv as unknown as {name: string, value: string}
      await addAlias(arg.name, arg.value);
    }
  )
  .command('run [runtime]', 'Lanza un runtime', (yargs) =>
    yargs.positional('runtime', {
      type: 'string',
      describe: 'Ejemplo: node:18',
    }), async argv => {
    await runCommand(argv.runtime);
  })
  .command('stop [container]', 'Para un runtime', (yargs) =>
    yargs.positional('container', {
      type: 'string',
      describe: 'Container',
    }), async argv => {
    await stopCommand(argv.container);
  })
  .command('open [container]', 'Abre un contenedor existente', (yargs) =>
    yargs.positional('container', {
      type: 'string',
      describe: 'Container',
    }), async argv => {
    await openCommand(argv.container);
  })
  .command('delete [container]', 'Elimina un contenedor', (yargs) =>
    yargs.positional('container', {
      type: 'string',
      describe: 'Container',
    }), async argv => {
    await deleteCommand(argv.container);
  })
  .demandCommand(1, 1, 'Debes especificar un comando (create, clone, open, delete)')
  .help()
  .argv;