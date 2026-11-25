import { exportPinganFamilyData } from '../api'

export async function downloadPinganFamilyData(activityKey, params) {
  const result = await exportPinganFamilyData(activityKey, params)
  const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
