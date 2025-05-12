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

// Matching:
export function matchRoute(input: string) {
    const [route, queryString] = input.split('?');
    const params = new URLSearchParams(queryString);
    
    const envRoutes = scanRoutes(path.join(process.env.CODER_HOME!, 'runtime'));
    const routes = [...envRoutes];
  
    for (const r of routes) {
        const m = route.match(r.pattern);
        if (m) {
            const p: Record<string, string> = {};
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

//const input = 'node/18/alpine?ssh=true&package=yarn';
//const input = 'my/node:18';

//const [route, queryString] = input.split('?');
//const params = new URLSearchParams(queryString);

//console.log('Ruta:', route); // node/18/alpine
//console.log('ssh:', params.get('ssh')); // 'true'
//console.log('package:', params.get('package')); // 'yarn'


// Ejemplo:
//const input = 'node/18/alpine';
//const match = matchRoute(input);
//if (match) {
//    console.log(match)
  //console.log('Dockerfile:', match.dockerfilePath);
  //console.log('Variables:', match.params);
//} else {
//  console.log('No match');
//}


