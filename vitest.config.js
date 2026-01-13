import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['lib/**/*.test.js', 'src/**/*.test.js'],
    globals: false,
    environment: 'node'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
