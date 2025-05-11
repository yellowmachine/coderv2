const fs = require('fs');
const path = require('path');
const {detect} = require('detect-port');

// === Configuración de rutas ===
//const BASE_DIR = path.resolve(__dirname);
const BASE_DIR = process.cwd();

const RUNTIME_DIR = path.join(BASE_DIR, 'runtime');
const SAMPLES_DIR = path.join(BASE_DIR, 'samples');
const TMP_DIR = path.join(BASE_DIR, 'tmp');

function getRuntimeOptions() {
    return fs.readdirSync(RUNTIME_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

function copyDirSync(src: string, dest: string) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach( (item: string ) => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      if (fs.lstatSync(srcPath).isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }
  
  // Crea la carpeta temporal y copia los archivos necesarios
  export async function createTempEnv(runtime: string /*, repo: string, branch: string*/) {
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
  
    const safeRuntime = runtime.replace(/[^a-zA-Z0-9-_]/g, '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempFolder = `${safeRuntime}-${timestamp}`;
    const tempPath = path.join(TMP_DIR, tempFolder);
  
    const port = await findAvailablePort(8080);

    fs.mkdirSync(tempPath);
  
    // Copiar runtime
    const runtimeSrc = path.join(RUNTIME_DIR, runtime);
    copyDirSync(runtimeSrc, tempPath);
  
    // Copiar docker-compose.yml
    const composeSrc = path.join(SAMPLES_DIR, 'docker-compose.yml');
    const composeDest = path.join(tempPath, 'docker-compose.yml');
    fs.copyFileSync(composeSrc, composeDest);
  
    // Crear .env
    const envContent = [
      //`GIT_REPO=${repo.ssh_url}`,
      //`GIT_BRANCH=${branch}`
      `CODE_PORT=${port}`
    ].join('\n');
    fs.writeFileSync(path.join(tempPath, '.env'), envContent);
  
    return {path: tempPath, port};
  }

export async function findAvailablePort(startPort = 8080) {
    const port = await detect(startPort);
    if (port === startPort) {
      console.log(`El puerto ${startPort} está libre`);
    } else {
      console.log(`El puerto ${startPort} está ocupado, el siguiente libre es ${port}`);
    }
    return port;
}

  