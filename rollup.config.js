import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.es.js',
      format: 'es',
    },
    {
      file: 'dist/index.umd.js',
      name: 'bolg-components',
      format: 'umd',
    },
  ],
  plugins: [resolve(), typescript({ tsconfig: './tsconfig.json' })],
}
