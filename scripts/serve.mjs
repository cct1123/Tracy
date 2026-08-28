import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function createStaticServer(root, { production = false } = {}) {
  const base = resolve(root);
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  };
  return createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, 'http://localhost').pathname,
      );
      const name = pathname === '/' ? '/index.html' : pathname;
      const allowed =
        name === '/index.html' ||
        name.startsWith('/src/') ||
        (production
          ? name.startsWith('/vendor/three/')
          : name.startsWith('/node_modules/three/'));
      if (
        !allowed ||
        name.split('/').some((part) => part.startsWith('.')) ||
        name.includes('\\')
      ) {
        res.writeHead(404);
        res.end();
        return;
      }
      const path = await realpath(resolve(base, '.' + name));
      const rel = relative(base, path);
      if (
        rel.startsWith('..' + sep) ||
        rel === '..' ||
        !(await stat(path)).isFile()
      ) {
        res.writeHead(404);
        res.end();
        return;
      }
      if (!mime[extname(path)]) {
        res.writeHead(404);
        res.end();
        return;
      }
      const body = await readFile(path);
      res.writeHead(200, {
        'Content-Type': mime[extname(path)] + '; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      res.writeHead(error instanceof URIError ? 400 : 404);
      res.end();
    }
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2),
    production = args.includes('--dist');
  const index = args.indexOf('--port'),
    port = index >= 0 ? Number(args[index + 1]) : 5173;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid --port');
  const root = resolve(
    fileURLToPath(new URL('..', import.meta.url)),
    production ? 'dist' : '.',
  );
  const server = createStaticServer(root, { production });
  server.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () =>
    console.log(`Tracy optical workbench: http://localhost:${port}`),
  );
}
