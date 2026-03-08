import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'

// Plugin: copy data files to dist/data/ after build + generate TypeScript declarations
const copyDataFiles = {
  name: 'copy-data-files',
  closeBundle() {
    mkdirSync('dist/data', { recursive: true })
    copyFileSync('src/data/states-default.geo.json', 'dist/data/states-default.geo.json')
    // Generate .d.ts so TypeScript users get FeatureCollection type automatically
    writeFileSync(
      'dist/data/states-default.geo.json.d.ts',
      'import type { FeatureCollection, MultiPolygon, Polygon } from "geojson"\ndeclare const data: FeatureCollection<MultiPolygon | Polygon>\nexport default data\n'
    )
  },
}

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      include: ['src'],
      exclude: ['src/data/**'],
    }),
    copyDataFiles,
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReactWorldMap',
      formats: ['es', 'cjs'],
      fileName: (format) => `react-world-map.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'd3-geo', 'd3-zoom', 'd3-selection'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'd3-geo': 'd3',
          'd3-zoom': 'd3',
          'd3-selection': 'd3',
        },
      },
    },
  },
})
