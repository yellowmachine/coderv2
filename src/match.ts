import * as fs from 'fs';
import * as path from 'path';

interface RoutePattern {
  pattern: RegExp;
  variables: string[];
  dockerfilePath: string;
  template: string; // Ej: '[base]/[version]/[mode]'
}

function scanRoutes(baseDir: string, prefix: string = ''): RoutePattern[] {
  const routes: RoutePattern[] = [];

  function walk(currentPath: string, parts: string[]) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(currentPath, entry.name), [...parts, entry.name]);
      } else if (entry.isFile() && entry.name === 'Dockerfile') {
        // Construir template y patrón
        const template = parts.join('/');
        const variables: string[] = [];
        // Convertir [var] en captura regex
        const patternStr = parts.map(part => {
          const match = part.match(/^\[(.+)\]$/);
          if (match) {
            variables.push(match[1]);
            return '([^/]+)';
          }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape
        }).join('/');

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

// Ejemplo de uso:
const envRoutes = scanRoutes(path.join(process.cwd(), 'runtime'));
//const customRoutes = scanRoutes(path.join(process.cwd(), 'custom'));
const allRoutes = [...envRoutes];

// Matching:
function matchRoute(input: string, routes: RoutePattern[]) {
  for (const route of routes) {
    const m = input.match(route.pattern);
    if (m) {
      const params: Record<string, string> = {};
      route.variables.forEach((v, i) => {
        params[v] = m[i + 1];
      });
      return {
        ...route,
        params
      };
    }
  }
  return null;
}

//const input = 'node/18/alpine?ssh=true&package=yarn';
const input = 'my/node:18';

const [route, queryString] = input.split('?');
const params = new URLSearchParams(queryString);

console.log('all routes', allRoutes);
console.log('Ruta:', route); // node/18/alpine
console.log('ssh:', params.get('ssh')); // 'true'
console.log('package:', params.get('package')); // 'yarn'


// Ejemplo:
//const input = 'node/18/alpine';
const match = matchRoute(route, allRoutes);
if (match) {
  console.log('Dockerfile:', match.dockerfilePath);
  console.log('Variables:', match.params);
} else {
  console.log('No match');
}


