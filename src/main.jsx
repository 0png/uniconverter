import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 隱藏 skeleton loader
const hideSkeleton = () => {
  const skeleton = document.getElementById('skeleton-loader')
  if (skeleton) {
    skeleton.classList.add('hidden')
    // 動畫結束後移除 DOM
    setTimeout(() => skeleton.remove(), 300)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// React 渲染後隱藏 skeleton
requestAnimationFrame(() => {
  requestAnimationFrame(hideSkeleton)
})
