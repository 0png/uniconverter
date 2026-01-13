const fs = require('fs')
const path = require('path')
const pngToIco = require('png-to-ico')
const sharp = require('sharp')

async function addRoundedCorners(inputPath, outputPath, cornerRadius = 80) {
  const image = sharp(inputPath)
  const metadata = await image.metadata()
  const { width, height } = metadata

  // 創建圓角遮罩 SVG
  const roundedMask = Buffer.from(
    `<svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
    </svg>`
  )

  // 應用圓角遮罩
  await image
    .composite([{
      input: roundedMask,
      blend: 'dest-in'
    }])
    .png()
    .toFile(outputPath)
  
  console.log('Added rounded corners to:', outputPath)
}

async function main() {
  const projectDir = __dirname.replace(/[\\/]scripts$/, '')
  const pngPath = path.join(projectDir, 'icon.png')
  const roundedPngPath = path.join(projectDir, 'icon_rounded.png')
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
    // 先為 PNG 添加圓角
    await addRoundedCorners(pngPath, roundedPngPath, 80)
    
    // 用圓角版本生成 ICO
    const buf = await pngToIco(roundedPngPath)
    fs.writeFileSync(outIco, buf)
    console.log('Generated ICO:', outIco)
    
    // 將圓角版本覆蓋原始 icon.png
    fs.copyFileSync(roundedPngPath, pngPath)
    fs.unlinkSync(roundedPngPath)
    console.log('Updated icon.png with rounded corners')
  } catch (err) {
    console.error('Failed to generate icon:', err)
    process.exit(1)
  }
}

main()
