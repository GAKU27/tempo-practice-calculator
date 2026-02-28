// scripts/build.js
const esbuild = require('esbuild');
const { sassPlugin } = require('esbuild-sass-plugin');
const { generateSW } = require('workbox-build');
const fs = require('fs');
const path = require('path');

const isDev = process.argv.includes('--dev');

async function build() {
    console.log(`Starting ${isDev ? 'development' : 'production'} build...`);

    // Ensure dist directory exists
    const distDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir);
    }

    try {
        // 1. Build TypeScript and SCSS using esbuild
        const context = await esbuild.context({
            entryPoints: [
                'src/main.ts'
            ],
            bundle: true,
            minify: !isDev,
            sourcemap: true,
            outdir: 'dist',
            target: 'es2020',
        });

        if (isDev) {
            await context.watch();
            console.log('Watching for changes...');
        } else {
            await context.rebuild();
            await context.dispose();
            console.log('✅ esbuild finished successfully.');

            // 2. Generate Service Worker using Workbox (Production only)
            await buildServiceWorker();
        }
    } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
    }
}

async function buildServiceWorker() {
    console.log('Generating Service Worker...');
    try {
        const { count, size, warnings } = await generateSW({
            swDest: 'dist/sw.js',
            globDirectory: '.',
            globPatterns: [
                'index.html',
                'dist/**/*.js',
                'tempo-calculator.css',
                'icon-*.png',
                'manifest.json'
            ],
            // Ignore sourcemaps from cache
            globIgnores: ['**/*.map', 'node_modules/**'],
            // Configure runtime caching for external resources
            runtimeCaching: [{
                urlPattern: /^https:\/\/fonts\.googleapis\.com/,
                handler: 'StaleWhileRevalidate',
                options: { cacheName: 'google-fonts-stylesheets' },
            }, {
                urlPattern: /^https:\/\/fonts\.gstatic\.com/,
                handler: 'CacheFirst',
                options: {
                    cacheName: 'google-fonts-webfonts',
                    expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                },
            }],
            // Skip waiting immediately to activate the new SW
            skipWaiting: true,
            clientsClaim: true,
        });

        warnings.forEach((warning) => console.warn(`[Workbox Warning]: ${warning}`));
        console.log(`✅ Service worker generated! Precaching ${count} files, totaling ${(size / 1024 / 1024).toFixed(2)} MB.`);
    } catch (err) {
        console.error('Service Worker generation failed:', err);
        throw err;
    }
}

build();
