import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isWeb = mode === 'web';
  const isDev = command === 'serve';
  const isElectronBuild = command === 'build' && !isWeb;
  const env = loadEnv(mode, __dirname, '');
  const cloudApiHost = env.VITE_CLOUD_API_HOST || process.env.VITE_CLOUD_API_HOST || '';
  const cloudApiBaseUrl = cloudApiHost ? `${cloudApiHost}/praiseprojector` : '';
  // Web builds (dev and prod) use a relative path so the runtime host is derived
  // from window.location.origin in config.ts — allowing the webapp to work on any host.
  // Electron builds use the absolute cloudApiBaseUrl when VITE_CLOUD_API_HOST is set,
  // otherwise fall back to relative path (runtime origin detection).
  const apiBaseUrl = isWeb ? '/praiseprojector' : (cloudApiBaseUrl || '/praiseprojector');

  return {
    plugins: [
      react(),
      tsconfigPaths(),
      // Inject a unique per-build CACHE_VERSION into sw.js so every new deploy
      // triggers proper service-worker cache invalidation without manual edits.
      {
        name: 'patch-sw-cache-version',
        closeBundle() {
          if (command !== 'build') return;
          const swPath = path.join(__dirname, 'dist', 'webapp', 'sw.js');
          try {
            const content = fs.readFileSync(swPath, 'utf8');
            // Derive a stable build ID from the content of index.html.
            // Vite embeds content-hashed asset filenames in index.html, so this
            // hash changes if and only if the actual bundle output changed.
            const indexPath = path.join(__dirname, 'dist', 'webapp', 'index.html');
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            const shortHash = crypto.createHash('sha256').update(indexContent).digest('hex').slice(0, 8);
            const buildId = `${pkg.version}-${shortHash}`;
            const patched = content.replace(
              /const CACHE_VERSION = '[^']*'/,
              `const CACHE_VERSION = '${buildId}'`
            );
            if (patched === content) {
              console.warn('[patch-sw] CACHE_VERSION pattern not found in dist/webapp/sw.js');
              return;
            }
            fs.writeFileSync(swPath, patched, 'utf8');
            console.log(`[patch-sw] dist/webapp/sw.js CACHE_VERSION → ${buildId}`);
          } catch {
            // sw.js absent in this build variant (e.g. electron-only) — skip
          }
        },
      },
      !isWeb && electron([
        {
          // Main-Process entry file of the Electron App.
          entry: 'electron/main.ts',
          // Prevent auto-launching Electron; VS Code launch config will start it
          onstart() {
            // Intentionally noop to avoid duplicate Electron instances in dev
          },
          vite: {
            build: {
              sourcemap: isDev,
              minify: !isDev,
              outDir: 'dist/electron',
              rollupOptions: {
                external: ['electron-updater', '@abandonware/bleno'],
              },
            },
          },
        },
        {
          entry: path.join(__dirname, 'electron/preload.ts'),
          onstart(options) {
            options.reload()
          },
          vite: {
            build: {
              sourcemap: isDev,
              minify: !isDev,
              outDir: 'dist/electron',
              emptyOutDir: false,
            },
          },
        },
      ]),
    ],
    base: isElectronBuild ? './' : (isDev ? '/' : '/webapp/'),
    build: {
      outDir: 'dist/webapp',
      sourcemap: isDev,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // React core + React-dependent UI libraries (must stay together)
            'vendor-react': ['react', 'react-dom', 'react-dnd', 'react-dnd-html5-backend', 'react-resizable-panels'],
            // PDF handling
            'vendor-pdf': ['pdfjs-dist'],
            // Music - ABC notation (used throughout the app for chord rendering)
            'vendor-abcjs': ['abcjs'],
            // Music - MIDI
            'vendor-midi': ['midi.js'],
            // Word document processing - NOTE: excluded from manual chunks
            // so it bundles with lazy-loaded SongImporterWizard
            // Diff library
            'vendor-diff': ['diff'],
            // Functional programming
            'vendor-fp': ['fp-ts', 'io-ts'],
            // Storage
            'vendor-storage': ['localforage'],
            // QR code generation
            'vendor-qrcode': ['qrcode.react'],
            // Utilities
            'vendor-utils': ['uuid', 'bootstrap', 'axios'],
          },
        },
      },
    },
    // Add proxy configuration for web app development
    server: {
      ...(isDev ? {
        fs: {
          allow: [path.resolve(__dirname, '..')],
        },
      } : {}),
      proxy: cloudApiHost ? {
        '/praiseprojector': {
          target: `${cloudApiHost}/praiseprojector`,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/praiseprojector/, ''),
        }
      } : undefined,
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
      'import.meta.env.VITE_CLOUD_API_HOST': JSON.stringify(cloudApiHost),
      '__APP_VERSION__': JSON.stringify(pkg.version),
    }
  };
});
