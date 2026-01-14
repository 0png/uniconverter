import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/**/src/**/*.test.js',
      'packages/**/__tests__/**/*.test.js'
    ],
    globals: false,
    environment: 'node'
  }
})
