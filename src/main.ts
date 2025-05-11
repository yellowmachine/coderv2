#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import prompts from 'prompts';
import { execSync } from 'child_process';
//import { Octokit } from '@octokit/rest';
import { createTempEnv, findAvailablePort } from './utils';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuración de GitHub
//const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
//const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;

// ===== FUNCIONES AUXILIARES =====

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

async function fetchUserRepos() {
  if (!octokit) throw new Error('GITHUB_TOKEN no definido');
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, { per_page: 100 });
  return repos.map(repo => ({
    title: repo.full_name + (repo.private ? ' (privado)' : ''),
    value: repo.ssh_url
  }));
}

async function promptUserRepo(): Promise<string> {
  const repos = await fetchUserRepos();
  const res = await prompts({
    type: 'autocomplete',
    name: 'repo',
    message: 'Selecciona un repo:',
    choices: repos
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

async function createCommand(repoArg?: string) {
  const repo = repoArg || await promptRepo();
  if (!repo) return;
  execSync(`npx degit ${repo}`, { stdio: 'inherit' });
}

async function cloneCommand() {
  const repo = await promptUserRepo();
  if (!repo) return;
  execSync(`git clone ${repo}`, { stdio: 'inherit' });
}

async function openCommand(containerArg?: string) {
  const container = containerArg || await promptContainer('abrir');
  if (!container) return;
  execSync(`docker start ${container}`, { stdio: 'inherit' });
}

async function deleteCommand(containerArg?: string) {
  const container = containerArg || await promptContainer('eliminar');
  if (!container) return;
  execSync(`docker rm -f ${container}`, { stdio: 'inherit' });
}

async function runCommand(runtime: string) {
  
  const {path, port} = await createTempEnv(runtime);
  try {
    // Ejecuta docker compose up -d en el directorio temporal
    const { stdout, stderr } = await execAsync('docker compose up -d', { cwd: path });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`http://localhost:${port}`);
  } catch (error) {
    console.error('Error al ejecutar docker compose:', error);
    throw error;
  }
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
  .command('create [repo]', 'Crea entorno desde repo', (yargs) =>
    yargs.positional('repo', {
      type: 'string',
      describe: 'Usuario/repo de GitHub',
    }), async argv => {
    await createCommand(argv.repo);
  })
  .command('clone', 'Clona un repo tuyo', {}, async () => {
    await cloneCommand();
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