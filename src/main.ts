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

async function promptRepo() {
  const res = await prompts({
    type: 'text',
    name: 'repo',
    message: 'Introduce usuario/repo de GitHub:'
  });
  return res.repo;
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
  execSync(`docker start ${container}`, { stdio: 'inherit' });
}

async function deleteCommand(containerArg?: string) {
  const container = containerArg || await promptContainer('eliminar');
  if (!container) return;
  execSync(`docker rm -f ${container}`, { stdio: 'inherit' });

  const tmpPath = path.join(process.cwd(), 'tmp', container);

  console.log(`Borrando carpeta temporal: ${tmpPath}`);

  try {
    await fs.rm(tmpPath, { recursive: true, force: true });
    console.log(`Carpeta temporal eliminada: ${tmpPath}`);
  } catch (err) {
    console.warn(`No se pudo borrar la carpeta temporal (${tmpPath}):`, err.message);
  }
}

async function runCommand(runtime: string) {
  const { path, port } = await createTempEnv(runtime);

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

// ===== YARGS INTEGRACIÓN =====

yargs(hideBin(process.argv))
  .scriptName('coder')
  .command('run [runtime]', 'Lanza un runtime', (yargs) =>
    yargs.positional('runtime', {
      type: 'string',
      describe: 'Ejemplo: node:18',
    }), async argv => {
    await runCommand(argv.runtime);
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