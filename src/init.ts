import fs from 'fs/promises';
import path from 'path';

export async function initCommand() {
    const base = process.env.CODER_HOME;
  
    if (!base) {
      console.error(`
  [ERROR] La variable de entorno CODER_HOME no está definida.
  
  Por favor, defínela antes de continuar. Ejemplo:
    export CODER_HOME=~/coder_home
  
  Puedes añadir esta línea a tu .bashrc, .zshrc o archivo de configuración de tu terminal.
  `);
      process.exit(1);
    }

    try {
        await fs.mkdir(base, { recursive: true });
    } catch (err) {
        console.error(`[ERROR] No se pudo crear el directorio base: ${base}`);
        process.exit(1);
    }

    try {
        await fs.mkdir(path.join(base, 'tmp'), { recursive: true });
    } catch (err) {
        console.error(`[ERROR] No se pudo crear el directorio tmp: ${path.join(base, 'tmp')}`);
        process.exit(1);
    }

  
    // Lista de carpetas a crear recursivamente
    const directories = [
      'runtime',
      'samples'
    ];
  
    for(const dir of directories) {
        const source = path.resolve(dir);
        const destination = path.join(process.env.CODER_HOME!, dir);
        
        try {
            // Verifica si el directorio fuente existe antes de copiarlo
            await fs.access(source);
            await copyDir(source, destination);
            console.log(`Copiado: ${dir} → ${destination}`);
          } catch (err) {
            console.warn(`[ADVERTENCIA] El directorio fuente "${dir}" no existe y no se ha copiado.`);
          }
    }
  
    console.log('\n¡Entorno inicializado correctamente en', base, '!');
  }

  async function copyDir(src: string, dest: string) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (let entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }