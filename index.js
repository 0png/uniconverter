const files = []
let outputDir = null
let action = null

function bytesToSize(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function renderFiles() {
  const drop = document.getElementById('drop-area')
  const empty = drop.querySelector('.drop-empty')
  const list = document.getElementById('file-list')
  const rows = document.getElementById('file-rows')
  const summary = document.getElementById('summary')
  renderActions()
  if (files.length === 0) {
    empty && empty.classList.remove('hidden')
    list.classList.add('hidden')
    summary.textContent = '0 file(s) selected. Total size: 0.00 KB'
    updateStartButtonsState()
    return
  }
  empty && empty.classList.add('hidden')
  list.classList.remove('hidden')
  rows.innerHTML = ''
  let total = 0
  files.forEach((f, i) => {
    const row = document.createElement('div')
    row.className = 'file-row'
    const name = document.createElement('div')
    name.className = 'col-name'
    name.textContent = f.name
    const size = document.createElement('div')
    size.className = 'col-size'
    size.textContent = bytesToSize(f.size || 0)
    total += f.size || 0
    const remove = document.createElement('div')
    remove.className = 'col-remove'
    const btn = document.createElement('button')
    btn.className = 'btn'
    btn.textContent = '移除'
    btn.onclick = () => {
      files.splice(i, 1)
      renderFiles()
    }
    remove.appendChild(btn)
    row.appendChild(name)
    row.appendChild(size)
    row.appendChild(remove)
    rows.appendChild(row)
  })
  summary.textContent = `${files.length} file(s) selected. Total size: ${bytesToSize(total)}`
  updateStartButtonsState()
}

async function chooseFiles() {
  const paths = await window.api.selectFiles()
  for (const p of paths) {
    files.push({ path: p, name: p.split(/[\\/]/).pop(), size: 0 })
  }
  dedupe()
  renderFiles()
}

async function chooseOutput() {
  const dir = await window.api.selectDir()
  if (dir) outputDir = dir
}

function onDrop(e) {
  e.preventDefault()
  const dt = e.dataTransfer
  const filesList = dt.files
  for (let i = 0; i < filesList.length; i++) {
    const f = filesList[i]
    const path = f.path || f.name
    files.push({ path, name: f.name, size: f.size })
  }
  dedupe()
  renderFiles()
}

function dedupe() {
  const seen = new Set()
  const u = []
  for (const f of files) {
    if (!seen.has(f.path)) {
      u.push(f); seen.add(f.path)
    }
  }
  files.length = 0
  files.push(...u)
}

function detectType(p) {
  const ext = (p.split('.').pop() || '').toLowerCase()
  if (['png','jpg','jpeg','heic','webp','bmp'].includes(ext)) return 'image'
  if (['pdf'].includes(ext)) return 'document'
  if (['mp4','mov','avi','mkv'].includes(ext)) return 'video'
  if (['mp3','wav','m4a'].includes(ext)) return 'audio'
  return 'unknown'
}

function getSuggestedActions() {
  const types = new Set(files.map(f => detectType(f.path)))
  const actions = []
  if (types.has('image')) {
    if (files.length > 1) actions.push('合併圖片為PDF')
    actions.push('批量轉PNG', '批量轉JPG')
  }
  if (types.has('document')) {
    actions.push('PDF每頁轉PNG', 'PDF每頁轉JPG')
  }
  if (types.has('video')) {
    actions.push('批量轉MP4', '批量轉MOV', '批量轉/提取MP3')
  }
  if (types.has('audio')) {
    actions.push('批量轉MP3', '批量轉WAV', '批量轉M4A')
  }
  if (actions.length === 0) {
    actions.push('合併圖片為PDF')
  }
  return Array.from(new Set(actions))
}

function renderActions() {
  const container = document.getElementById('actions')
  container.innerHTML = ''
  const acts = getSuggestedActions()
  acts.forEach(a => {
    const btn = document.createElement('button')
    btn.className = 'btn option' + (action === a ? ' active' : '')
    btn.textContent = a
    btn.onclick = () => {
      action = a
      renderActions()
      updateStartButtonsState()
    }
    container.appendChild(btn)
  })
  updateStartButtonsState()
}

async function startAction() {
  if (!files.length || !action) {
    setStatus('請先選擇檔案與操作')
    return
  }
  setProgress(0)
  setStatus('執行中...')
  const payload = {
    action,
    files: files.map(f => f.path),
    output_dir: outputDir || null
  }
  const r = await window.api.doAction(payload)
  if (r && r.ok && r.data) {
    setProgress(1)
    setStatus(`完成 成功:${r.data.ok} 失敗:${r.data.fail}`)
    alert(`成功 ${r.data.ok}，失敗 ${r.data.fail}`)
  } else {
    setStatus('執行失敗')
    alert('執行失敗')
  }
}

function setProgress(v) {
  const bar = document.getElementById('progress-bar')
  bar.style.width = `${Math.max(0, Math.min(1, v)) * 100}%`
}

function setStatus(t) {
  document.getElementById('status').textContent = t
}

function updateStartButtonsState() {
  const dis = !action || files.length === 0
  const top = document.getElementById('btn-start-top')
  const bottom = document.getElementById('btn-start')
  ;[top, bottom].forEach(b => {
    if (!b) return
    b.disabled = dis
    b.classList.toggle('disabled', dis)
  })
}

function init() {
  if (!window.api) {
    setStatus('API 介面未載入（preload 失敗）')
  }
  const drop = document.getElementById('drop-area')
  drop.addEventListener('dragover', e => { e.preventDefault() })
  drop.addEventListener('drop', onDrop)
  document.getElementById('btn-choose-files').onclick = async () => {
    try {
      await chooseFiles()
    } catch (e) {
      console.error(e)
      setStatus('選擇檔案失敗')
    }
  }
  document.getElementById('btn-output-dir').onclick = chooseOutput
  document.getElementById('btn-start-top').onclick = async () => {
    try { await startAction() } catch (e) { console.error(e); setStatus('執行失敗') }
  }
  document.getElementById('btn-start').onclick = async () => {
    try { await startAction() } catch (e) { console.error(e); setStatus('執行失敗') }
  }
  renderFiles()
  updateStartButtonsState()
}

window.addEventListener('DOMContentLoaded', init)
