 const fs = require('fs')
const path = require('path')
const pngToIco = require('png-to-ico')

async function main() {
  const projectDir = __dirname.replace(/\\scripts$/, '')
  const pngPath = path.join(projectDir, 'icon.png')
  const outDir = path.join(projectDir, 'build')
  const outIco = path.join(outDir, 'icon.ico')

  if (!fs.existsSync(pngPath)) {
    console.error('icon.png not found at project root:', pngPath)
    process.exit(1)
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir)
  }
  try {
    const buf = await pngToIco(pngPath)
    fs.writeFileSync(outIco, buf)
    console.log('Generated:', outIco)
  } catch (err) {
    console.error('Failed to generate ICO from PNG:', err)
    process.exit(1)
  }
}

main()
