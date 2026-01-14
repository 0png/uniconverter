import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * 將位元組數轉換為人類可讀的格式
 * @param {number} n - 位元組數
 * @returns {string} 格式化後的字串 (B, KB, 或 MB)
 */
export function bytesToSize(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
