// Simple esbuild script to bundle Dynamic SDK
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['frontend/dynamic-widget.js'],
  bundle: true,
  outfile: 'frontend/dynamic-auth.bundle.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: false,
  sourcemap: true,
}).then(() => {
  console.log('✓ Dynamic widget bundled successfully');
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
