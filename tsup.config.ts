import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // React is provided by the consumer — never bundle it.
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  // Output separate CSS file so consumers can import it via their bundler
  // (Vite, Webpack, Next.js, etc.) without any extra configuration.
  // Consumers import: import '@tavosud/sky-parallax/dist/index.css'
});
