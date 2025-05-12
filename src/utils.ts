import { matchRoute } from "./match";

const fs = require('fs');
const path = require('path');
const {detect} = require('detect-port');

// === Configuración de rutas ===
const BASE_DIR = process.env.CODER_HOME!;

const RUNTIME_DIR = path.join(BASE_DIR, 'runtime');
const SAMPLES_DIR = path.join(BASE_DIR, 'samples');
const TMP_DIR = path.join(BASE_DIR, 'tmp');

function getRuntimeOptions() {
    return fs.readdirSync(RUNTIME_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

function copyDockerfileSync(src: string, dest: string) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(src, path.join(dest, 'Dockerfile'));
    /*fs.readdirSync(src).forEach( (item: string ) => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      //if (fs.lstatSync(srcPath).isDirectory()) {
      //  copyDirSync(srcPath, destPath);
      //} else {
      //fs.copyFileSync(srcPath, destPath);
      //}
    });
    */
  }
  
  // Crea la carpeta temporal y copia los archivos necesarios
  export async function createTempEnv(runtime: string) {
    const { variables, dockerfilePath } = matchRoute(runtime);
    
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
  
    const safeRuntime = runtime.replace(/[^a-zA-Z0-9-_]/g, '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempFolder = `${safeRuntime}-${timestamp}`;
    const containerName = tempFolder;
    const tempPath = path.join(TMP_DIR, tempFolder);
  
    const port = await findAvailablePort(8080);

    fs.mkdirSync(tempPath);
  
    // Copiar runtime
    //const runtimeSrc = path.join(RUNTIME_DIR, dockerfilePath);
    //copyDirSync(runtimeSrc, tempPath);
    copyDockerfileSync(dockerfilePath, tempPath);
  
    // Copiar docker-compose.yml
    const composeSrc = path.join(SAMPLES_DIR, 'docker-compose.yml');
    const composeDest = path.join(tempPath, 'docker-compose.yml');
    fs.copyFileSync(composeSrc, composeDest);
  
    // Crear .env
    const env = Object.entries(variables).map(([k, v]) => `${k.toUpperCase()}=${v}` );
    console.log(env);
    const envContent = [
      ...env,
      `CODE_PORT=${port}`,
      `CONTAINER_NAME=${containerName}`
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

  