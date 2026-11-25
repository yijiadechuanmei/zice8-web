import femalePhoto from './assets/mock-female.jpg'
import malePhoto from './assets/mock-male.jpg'

const interests = ['阅读、旅行', '摄影、音乐', '运动、电影', '美食、徒步', '绘画、羽毛球']
const companies = ['天津分行', '滨海支行', '和平支行', '河西支行', '南开支行']

// 展示用虚拟资料仅存在于前端，不参与提交、后台统计或作品管理。
export const mockGallery = Array.from({ length: 50 }, (_, index) => {
  const gender = index % 2 === 0 ? '女' : '男'
  return {
    id: `mock-${index + 1}`,
    gender,
    name: `嘉宾${String(index + 1).padStart(2, '0')}`,
    company: companies[index % companies.length],
    interests: interests[index % interests.length],
    photoUrl: gender === '女' ? femalePhoto : malePhoto,
  }
})

export function visibleGallery(realGallery, viewerGender) {
  const opposite = viewerGender === '男' ? '女' : viewerGender === '女' ? '男' : ''
  return [...realGallery, ...mockGallery].filter((entry) => !opposite || entry.gender === opposite)
}
