/**
 * 打包後自動整理 release 檔案
 * 將所有需要上傳到 GitHub Release 的檔案整理到版本號資料夾中
 */

const fs = require('fs')
const path = require('path')

// 讀取 package.json 取得版本號
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const version = packageJson.version

const releaseDir = path.join(__dirname, '..', 'release')
const versionDir = path.join(releaseDir, `v${version}`)

// 需要複製的檔案類型
const filesToCopy = [
  `Uniconvert Setup ${version}.exe`,
  `Uniconvert Setup ${version}.exe.blockmap`,
  'latest.yml'
]

console.log(`\n📦 整理 Release 檔案 v${version}`)
console.log('='.repeat(40))

// 建立版本資料夾
if (!fs.existsSync(versionDir)) {
  fs.mkdirSync(versionDir, { recursive: true })
  console.log(`✅ 建立資料夾: v${version}/`)
} else {
  console.log(`📁 資料夾已存在: v${version}/`)
}

// 複製檔案
let copiedCount = 0
for (const fileName of filesToCopy) {
  const srcPath = path.join(releaseDir, fileName)
  const destPath = path.join(versionDir, fileName)
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath)
    const size = (fs.statSync(srcPath).size / 1024 / 1024).toFixed(2)
    console.log(`✅ 複製: ${fileName} (${size} MB)`)
    copiedCount++
  } else {
    console.log(`⚠️  找不到: ${fileName}`)
  }
}

console.log('='.repeat(40))
console.log(`\n🎉 完成！已複製 ${copiedCount} 個檔案到 release/v${version}/`)
console.log(`\n📤 上傳到 GitHub Release 時，請上傳以下檔案:`)
filesToCopy.forEach(f => console.log(`   - ${f}`))
console.log('')
