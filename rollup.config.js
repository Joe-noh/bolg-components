import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'esm',
    },
    {
      file: 'dist/index.umd.js',
      name: 'bolg-components',
      format: 'umd',
    },
  ],
  plugins: [
    resolve(),
    typescript({ sourceMap: false }),
  ],
}
