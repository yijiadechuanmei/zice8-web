/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import {
  clearLongwenBeerQuizData,
  clearXiangyuGlobalTreasureData,
  clearRiderSafetySurveyData,
  clearSongWishLotteryDraws,
  deleteNanshaOpenMicEntry,
  getActivityConfig,
  getArtistCallLotteryPrizes,
  getNanhaiChallengeDrawControl,
  getNanhaiChallengePrizes,
  getNanhaiChallengeRegionAccessExemptions,
  getNanshaOpenMicConfig,
  getSongWishLotteryResultConfig,
  manualDrawSongWishLottery,
  revokeSongWishLotteryDraw,
  resetNanshaOpenMicData,
  saveArtistCallLotteryPrizes,
  saveNanhaiChallengeDrawAutoControl,
  saveNanhaiChallengePrizes,
  resetNanhaiChallengeData,
  saveSongWishLotteryResultConfig,
  updateActivityBgmConfig,
  updateActivityStatus,
  updateNanhaiChallengeDrawManualControl,
  updateNanhaiChallengeRegionAccessExemption,
  updateNanshaOpenMicConfig,
  updateRiderSafetySurveyMode,
} from '../api'

const { Text, Title } = Typography

const defaultBgm = {
  enabled: false,
  url: '',
  loop: true,
  autoplay: true,
  showControl: true,
  volume: 0.6,
}

const defaultNanhaiDrawControl = {
  effectiveMode: 'normal',
  manualMode: 'normal',
  manualReason: '',
  autoEnabled: true,
  windowSeconds: 180,
  maxWinCount: 60,
  maxWinsPerIp: 20,
  maxWinAmountFen: 6000,
  cooldownSeconds: 180,
  autoPausedUntil: null,
  autoReason: '',
  autoTriggerCount: 0,
  recentMetrics: { winCount: 0, winAmountFen: 0 },
  events: [],
}

export default function ActivityConfigPage({ activity }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [error, setError] = useState('')
  const [activityStatus, setActivityStatus] = useState(Number(activity?.status) === 1 ? 1 : 0)
  const [bgm, setBgm] = useState(defaultBgm)
  const [prizes, setPrizes] = useState([])
  const [prizeSaving, setPrizeSaving] = useState(false)
  const [nanhaiPrizes, setNanhaiPrizes] = useState([])
  const [nanhaiBudget, setNanhaiBudget] = useState(null)
  const [nanhaiPrizeSaving, setNanhaiPrizeSaving] = useState(false)
  const [nanhaiDrawControl, setNanhaiDrawControl] = useState(defaultNanhaiDrawControl)
  const [nanhaiControlLoaded, setNanhaiControlLoaded] = useState(false)
  const [nanhaiControlReason, setNanhaiControlReason] = useState('')
  const [nanhaiControlSaving, setNanhaiControlSaving] = useState(false)
  const [nanhaiResetUserId, setNanhaiResetUserId] = useState('')
  const [nanhaiResetting, setNanhaiResetting] = useState(false)
  const [nanhaiRegionExemptions, setNanhaiRegionExemptions] = useState([])
  const [nanhaiRegionUserId, setNanhaiRegionUserId] = useState('')
  const [nanhaiRegionReason, setNanhaiRegionReason] = useState('')
  const [nanhaiRegionSaving, setNanhaiRegionSaving] = useState(false)
  const [songWishResult, setSongWishResult] = useState({ publishAt: '2026-07-29T00:00', prizes: [], winners: [], entryTotal: 0, winnerTotal: 0 })
  const [songWishSaving, setSongWishSaving] = useState(false)
  const [manualDrawing, setManualDrawing] = useState(false)
  const [manualPrizeId, setManualPrizeId] = useState('')
  const [manualTargets, setManualTargets] = useState('')
  const [revokeDrawId, setRevokeDrawId] = useState('')
  const [clearingDraws, setClearingDraws] = useState(false)
  const [nanshaConfig, setNanshaConfig] = useState({ currentPhase: 'upload', dailyVoteLimit: 10, uploadStartAt: '', uploadEndAt: '' })
  const [nanshaConfigSaving, setNanshaConfigSaving] = useState(false)
  const [nanshaResetting, setNanshaResetting] = useState(false)
  const [nanshaDeleteEntryId, setNanshaDeleteEntryId] = useState('')
  const [nanshaDeletingEntry, setNanshaDeletingEntry] = useState(false)
  const [longwenClearing, setLongwenClearing] = useState(false)
  const [xiangyuClearScope, setXiangyuClearScope] = useState('user')
  const [xiangyuUserId, setXiangyuUserId] = useState('')
  const [xiangyuClearing, setXiangyuClearing] = useState(false)
  const [riderSafetyClearScope, setRiderSafetyClearScope] = useState('user')
  const [riderSafetyUserId, setRiderSafetyUserId] = useState('')
  const [riderSafetyClearing, setRiderSafetyClearing] = useState(false)
  const [riderSafetyTestMode, setRiderSafetyTestMode] = useState(true)
  const [riderSafetyModeSaving, setRiderSafetyModeSaving] = useState(false)

  useEffect(() => {
    if (!activity?.activityKey) return
    let alive = true
    setLoading(true)
    setError('')
    getActivityConfig(activity.activityKey)
      .then((data) => {
        if (!alive) return
        setActivityStatus(Number(data?.activity?.status) === 1 ? 1 : 0)
        setRiderSafetyTestMode(data?.configJson?.testMode === true)
        setBgm({
          enabled: Boolean(data?.bgm?.enabled),
          url: String(data?.bgm?.url || ''),
          loop: data?.bgm?.loop !== false,
          autoplay: data?.bgm?.autoplay !== false,
          showControl: data?.bgm?.showControl !== false,
          volume: Number.isFinite(Number(data?.bgm?.volume)) ? Number(data.bgm.volume) : 0.6,
        })
      })
      .catch((err) => {
        if (!alive) return
        const text = err?.response?.data?.errorCode === 'activity_config_permission_denied'
          ? '无权修改活动配置'
          : (err.message || '活动配置加载失败')
        setError(text)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    if (activity.type === 'artist_call_lottery') {
      getArtistCallLotteryPrizes(activity.activityKey)
        .then((data) => { if (alive) setPrizes(data?.prizes || []) })
        .catch((err) => { if (alive) setError(err.message || '奖品配置加载失败') })
    } else {
      setPrizes([])
    }

    if (activity.type === 'nanhai_inspection_challenge') {
      setNanhaiControlLoaded(false)
      getNanhaiChallengePrizes(activity.activityKey)
        .then((data) => {
          if (!alive) return
          setNanhaiPrizes(data?.prizes || [])
          setNanhaiBudget(data?.budget || null)
        })
        .catch((err) => { if (alive) setError(err.message || '红包配置加载失败') })
      getNanhaiChallengeDrawControl(activity.activityKey)
        .then((data) => {
          if (!alive) return
          setNanhaiDrawControl({ ...defaultNanhaiDrawControl, ...(data || {}) })
          setNanhaiControlLoaded(true)
        })
        .catch((err) => { if (alive) setError(err.message || '抽奖控制状态加载失败') })
      getNanhaiChallengeRegionAccessExemptions(activity.activityKey)
        .then((data) => { if (alive) setNanhaiRegionExemptions(data?.exemptions || []) })
        .catch((err) => { if (alive) setError(err.message || '地区人工放行记录加载失败') })
    } else {
      setNanhaiPrizes([])
      setNanhaiBudget(null)
      setNanhaiDrawControl(defaultNanhaiDrawControl)
      setNanhaiControlLoaded(false)
      setNanhaiRegionExemptions([])
    }

    if (activity.type === 'song_wish_lottery') {
      getSongWishLotteryResultConfig(activity.activityKey)
        .then((data) => {
          if (!alive) return
          setSongWishResult({
            publishAt: toDateTimeInput(data?.publishAt || '2026-07-29T00:00'),
            prizes: data?.prizes || [],
            winners: data?.winners || [],
            entryTotal: Number(data?.entryTotal || 0),
            winnerTotal: Number(data?.winnerTotal || 0),
          })
        })
        .catch((err) => { if (alive) setError(err.message || '歌曲许愿开奖配置加载失败') })
    }

    if (activity.type === 'nansha_open_mic') {
      getNanshaOpenMicConfig(activity.activityKey)
        .then((data) => {
          if (!alive) return
          setNanshaConfig({
            currentPhase: data?.currentPhase || 'upload',
            dailyVoteLimit: Number(data?.dailyVoteLimit || 10),
            uploadStartAt: toOptionalDateTimeInput(data?.uploadStartAt),
            uploadEndAt: toOptionalDateTimeInput(data?.uploadEndAt),
          })
        })
        .catch((err) => { if (alive) setError(err.message || '南沙活动阶段配置加载失败') })
    }

    return () => {
      alive = false
    }
  }, [activity?.activityKey, activity?.type])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const data = await updateActivityBgmConfig(activity.activityKey, bgm)
      setBgm({
        enabled: Boolean(data?.bgm?.enabled),
        url: String(data?.bgm?.url || ''),
        loop: data?.bgm?.loop !== false,
        autoplay: data?.bgm?.autoplay !== false,
        showControl: data?.bgm?.showControl !== false,
        volume: Number.isFinite(Number(data?.bgm?.volume)) ? Number(data.bgm.volume) : 0.6,
      })
      message.success('活动背景音乐配置已保存')
    } catch (err) {
      const text = err?.response?.data?.errorCode === 'activity_config_permission_denied'
        ? '无权修改活动配置'
        : (err.message || '活动配置保存失败')
      setError(text)
      message.error(text)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNanshaConfig() {
    setNanshaConfigSaving(true)
    setError('')
    try {
      const data = await updateNanshaOpenMicConfig(activity.activityKey, {
        ...nanshaConfig,
        uploadStartAt: toOptionalDateTimeISOString(nanshaConfig.uploadStartAt),
        uploadEndAt: toOptionalDateTimeISOString(nanshaConfig.uploadEndAt),
      })
      setNanshaConfig({
        currentPhase: data.currentPhase,
        dailyVoteLimit: Number(data.dailyVoteLimit),
        uploadStartAt: toOptionalDateTimeInput(data.uploadStartAt),
        uploadEndAt: toOptionalDateTimeInput(data.uploadEndAt),
      })
      message.success('活动阶段、报名时间与每日票数已保存')
    } catch (err) {
      setError(err.message || '南沙活动配置保存失败')
    } finally {
      setNanshaConfigSaving(false)
    }
  }

  async function handleResetNanshaData() {
    setNanshaResetting(true)
    setError('')
    try {
      const result = await resetNanshaOpenMicData(activity.activityKey)
      const cleared = result?.cleared || {}
      message.success(`已清空报名 ${cleared.entries || 0} 条、投票 ${cleared.votes || 0} 条、参与用户 ${cleared.participants || 0} 条`)
    } catch (err) {
      const text = err.message || '清空南沙活动数据失败'
      setError(text)
      message.error(text)
    } finally {
      setNanshaResetting(false)
    }
  }

  async function handleDeleteNanshaEntry() {
    const entryId = nanshaDeleteEntryId.trim()
    if (!/^\d+$/.test(entryId)) {
      message.warning('请输入正确的作品ID')
      return
    }
    setNanshaDeletingEntry(true)
    setError('')
    try {
      const result = await deleteNanshaOpenMicEntry(activity.activityKey, entryId)
      const deleted = result?.deleted || {}
      setNanshaDeleteEntryId('')
      message.success(`已删除作品 ${deleted.entryId || entryId} 的上传记录，可重新报名`)
    } catch (err) {
      const text = err.message || '删除指定作品上传记录失败'
      setError(text)
      message.error(text)
    } finally {
      setNanshaDeletingEntry(false)
    }
  }

  async function handleClearLongwenBeerQuizData() {
    setLongwenClearing(true)
    setError('')
    try {
      const result = await clearLongwenBeerQuizData(activity.activityKey)
      const cleared = result?.cleared || {}
      message.success(`已清空 ${cleared.records || 0} 条答题记录、${cleared.participants || 0} 条参与记录`)
    } catch (err) {
      const text = err.message || '清空龙文答题数据失败'
      setError(text)
      message.error(text)
    } finally {
      setLongwenClearing(false)
    }
  }

  async function handleClearXiangyuGlobalTreasureData() {
    const scope = xiangyuClearScope
    const userId = xiangyuUserId.trim()
    if (scope === 'user' && !/^[1-9]\d*$/.test(userId)) {
      message.warning('请输入要清除的正整数用户ID')
      return
    }
    setXiangyuClearing(true)
    setError('')
    try {
      const result = await clearXiangyuGlobalTreasureData(activity.activityKey, {
        scope,
        ...(scope === 'user' ? { userId } : {}),
      })
      const cleared = result?.cleared || {}
      if (scope === 'user') setXiangyuUserId('')
      message.success(`已清除抽奖 ${cleared.draws || 0} 条、参与记录 ${cleared.participants || 0} 条`)
    } catch (err) {
      const text = err.message || '清除象屿寻宝数据失败'
      setError(text)
      message.error(text)
    } finally {
      setXiangyuClearing(false)
    }
  }

  async function handleClearRiderSafetySurveyData() {
    const scope = riderSafetyClearScope
    const userId = riderSafetyUserId.trim()
    if (!riderSafetyTestMode && scope !== 'user') {
      message.warning('正式阶段仅允许清除指定用户')
      return
    }
    if (scope === 'user' && !/^[1-9]\d*$/.test(userId)) {
      message.warning('请输入要清除的正整数用户ID')
      return
    }
    setRiderSafetyClearing(true)
    setError('')
    try {
      const result = await clearRiderSafetySurveyData(activity.activityKey, {
        scope,
        ...(scope === 'user' ? { userId } : {}),
      })
      const cleared = result?.cleared || {}
      if (scope === 'user') setRiderSafetyUserId('')
      message.success(`已清除问卷 ${cleared.submissions || 0} 条、抽奖 ${cleared.draws || 0} 条；${cleared.resetCashPrizeStock ? '测试数据已重置，真实红包流水、库存和预算已保留' : '该用户可重新参与，真实红包流水、库存和预算已保留'}`)
    } catch (err) {
      const text = err.message || '清除骑手安全问卷数据失败'
      setError(text)
      message.error(text)
    } finally {
      setRiderSafetyClearing(false)
    }
  }

  async function handleRiderSafetyModeChange(mode) {
    setRiderSafetyModeSaving(true)
    setError('')
    try {
      const result = await updateRiderSafetySurveyMode(activity.activityKey, mode)
      const testMode = result?.testMode === true
      setRiderSafetyTestMode(testMode)
      message.success(testMode ? '已切换至测试阶段，红包不会真实发放' : '已切换至正式阶段，后续红包将按微信授权和风控规则发放')
    } catch (err) {
      const text = err.message || '活动阶段切换失败'
      setError(text)
      message.error(text)
    } finally {
      setRiderSafetyModeSaving(false)
    }
  }

  async function handleStatusChange(enabled) {
    setStatusSaving(true)
    setError('')
    try {
      const data = await updateActivityStatus(activity.activityKey, enabled ? 1 : 0)
      setActivityStatus(Number(data?.status) === 1 ? 1 : 0)
      message.success(enabled ? '活动已启用' : '活动已停用')
    } catch (err) {
      const text = err.message || '活动状态更新失败'
      setError(text)
      message.error(text)
    } finally {
      setStatusSaving(false)
    }
  }

  function updatePrize(index, patch) {
    setPrizes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  function addPrize() {
    setPrizes((items) => [...items, {
      id: '', prizeName: '', prizeLevel: '', prizeImage: '', prizeType: 'win', probability: 0, quantity: 0, issuedCount: 0, remainingCount: 0, enabled: true,
    }])
  }

  async function handleSavePrizes() {
    setPrizeSaving(true)
    setError('')
    try {
      const data = await saveArtistCallLotteryPrizes(activity.activityKey, prizes)
      setPrizes(data?.prizes || [])
      message.success('奖品配置已保存')
    } catch (err) {
      const text = err.message || '奖品配置保存失败'
      setError(text)
      message.error(text)
    } finally {
      setPrizeSaving(false)
    }
  }

  function updateNanhaiPrize(index, patch) {
    setNanhaiPrizes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  async function handleSaveNanhaiPrizes() {
    setNanhaiPrizeSaving(true)
    setError('')
    try {
      const data = await saveNanhaiChallengePrizes(activity.activityKey, nanhaiPrizes)
      setNanhaiPrizes(data?.prizes || [])
      setNanhaiBudget(data?.budget || null)
      message.success('红包数量与概率已保存')
    } catch (err) {
      const text = err.message || '红包配置保存失败'
      setError(text)
      message.error(text)
    } finally {
      setNanhaiPrizeSaving(false)
    }
  }

  async function handleSaveNanhaiAutoControl() {
    setNanhaiControlSaving(true)
    setError('')
    try {
      const data = await saveNanhaiChallengeDrawAutoControl(activity.activityKey, {
        autoEnabled: Boolean(nanhaiDrawControl.autoEnabled),
        windowSeconds: Number(nanhaiDrawControl.windowSeconds),
        maxWinCount: Number(nanhaiDrawControl.maxWinCount),
        maxWinsPerIp: Number(nanhaiDrawControl.maxWinsPerIp),
        maxWinAmountFen: Number(nanhaiDrawControl.maxWinAmountFen),
        cooldownSeconds: Number(nanhaiDrawControl.cooldownSeconds),
      })
      setNanhaiDrawControl({ ...defaultNanhaiDrawControl, ...(data || {}) })
      message.success('自动熔断参数已保存')
    } catch (err) {
      const text = err.message || '自动熔断参数保存失败'
      setError(text)
      message.error(text)
    } finally {
      setNanhaiControlSaving(false)
    }
  }

  async function handleNanhaiControlAction(action) {
    const reason = nanhaiControlReason.trim()
    if (action !== 'resume' && reason.length < 2) {
      message.warning('请先填写至少2个字的操作原因')
      return
    }
    setNanhaiControlSaving(true)
    setError('')
    try {
      const data = await updateNanhaiChallengeDrawManualControl(activity.activityKey, {
        action,
        reason: reason || '后台恢复正常抽奖',
      })
      setNanhaiDrawControl({ ...defaultNanhaiDrawControl, ...(data || {}) })
      setNanhaiControlReason('')
      message.success(action === 'pause' ? '抽奖已暂停' : action === 'force_loss' ? '已开启强制未中奖' : '已恢复正常抽奖')
    } catch (err) {
      const text = err.message || '抽奖控制操作失败'
      setError(text)
      message.error(text)
    } finally {
      setNanhaiControlSaving(false)
    }
  }

  async function handleResetNanhaiData() {
    const userId = nanhaiResetUserId.trim()
    if (!/^[1-9]\d*$/.test(userId)) {
      message.warning('请输入要清除的正整数用户ID')
      return
    }
    setNanhaiResetting(true)
    setError('')
    try {
      const result = await resetNanhaiChallengeData(activity.activityKey, {
        scope: 'user',
        userId,
      })
      const cleared = result?.cleared || {}
      setNanhaiResetUserId('')
      const config = await getNanhaiChallengePrizes(activity.activityKey)
      setNanhaiPrizes(config?.prizes || [])
      setNanhaiBudget(config?.budget || null)
      message.success(`已清除抽奖 ${cleared.draws || 0} 条、答题 ${cleared.answers || 0} 条、授权 ${cleared.authorizations || 0} 条`)
    } catch (err) {
      const text = err.message || '清除幸福南海活动数据失败'
      setError(text)
      message.error(text)
    } finally {
      setNanhaiResetting(false)
    }
  }

  async function handleNanhaiRegionAccess(action, targetUserId = nanhaiRegionUserId) {
    const userId = String(targetUserId || '').trim()
    const reason = nanhaiRegionReason.trim()
    if (!/^[1-9]\d*$/.test(userId)) {
      message.warning('请输入要人工放行的正整数用户ID')
      return
    }
    if (action === 'allow' && reason.length < 2) {
      message.warning('请填写至少2个字的核验原因')
      return
    }
    setNanhaiRegionSaving(true)
    setError('')
    try {
      const data = await updateNanhaiChallengeRegionAccessExemption(activity.activityKey, {
        action,
        userId,
        reason: action === 'allow' ? reason : '撤销人工放行',
      })
      setNanhaiRegionExemptions(data?.exemptions || [])
      if (action === 'allow') {
        setNanhaiRegionUserId('')
        setNanhaiRegionReason('')
      }
      message.success(action === 'allow' ? '已人工放行该用户' : '已撤销该用户的人工放行')
    } catch (err) {
      const text = err.message || '地区人工放行操作失败'
      setError(text)
      message.error(text)
    } finally {
      setNanhaiRegionSaving(false)
    }
  }

  function updateSongWishPrize(index, patch) {
    setSongWishResult((current) => ({
      ...current,
      prizes: current.prizes.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }))
  }

  function addSongWishPrize() {
    setSongWishResult((current) => ({
      ...current,
      prizes: [...current.prizes, {
        id: '', prizeLevel: '', prizeName: '', prizeImage: '', quantity: 0, issuedCount: 0, remainingCount: 0, enabled: true,
      }],
    }))
  }

  async function handleSaveSongWishResult() {
    setSongWishSaving(true)
    setError('')
    try {
      const data = await saveSongWishLotteryResultConfig(activity.activityKey, {
        publishAt: songWishResult.publishAt,
        prizes: songWishResult.prizes,
      })
      setSongWishResult((current) => ({
        ...current,
        publishAt: toDateTimeInput(data?.publishAt || current.publishAt),
        prizes: data?.prizes || [],
      }))
      message.success('歌曲许愿开奖配置已保存')
    } catch (err) {
      const text = err.message || '歌曲许愿开奖配置保存失败'
      setError(text)
      message.error(text)
    } finally {
      setSongWishSaving(false)
    }
  }

  async function handleManualDraw() {
    const targets = manualTargets.split(/[\s,，;；]+/).map((item) => item.trim()).filter(Boolean)
    if (!manualPrizeId) {
      message.warning('请选择要发放的奖项')
      return
    }
    if (!targets.length) {
      message.warning('请输入 OpenID 或用户ID')
      return
    }
    setManualDrawing(true)
    setError('')
    try {
      const data = await manualDrawSongWishLottery(activity.activityKey, { prizeId: manualPrizeId, targets })
      const skipped = Math.max(Number(data?.requested || 0) - Number(data?.awarded || 0), 0)
      message.success(`已指定 ${data?.awarded || 0} 名中奖用户${skipped ? `，${skipped} 名未处理` : ''}`)
      if (skipped) {
        const detail = (data?.results || []).filter((item) => item.status !== 'awarded').slice(0, 3).map((item) => `${item.target}：${item.message}`).join('；')
        if (detail) message.warning(detail)
      }
      setManualTargets('')
      const next = await getSongWishLotteryResultConfig(activity.activityKey)
      setSongWishResult({
        publishAt: toDateTimeInput(next?.publishAt || songWishResult.publishAt),
        prizes: next?.prizes || [],
        winners: next?.winners || [],
        entryTotal: Number(next?.entryTotal || 0),
        winnerTotal: Number(next?.winnerTotal || 0),
      })
    } catch (err) {
      const text = err.message || '手动开奖失败'
      setError(text)
      message.error(text)
    } finally {
      setManualDrawing(false)
    }
  }

  async function refreshSongWishResult() {
    const next = await getSongWishLotteryResultConfig(activity.activityKey)
    setSongWishResult((current) => ({
      ...current,
      publishAt: toDateTimeInput(next?.publishAt || current.publishAt),
      prizes: next?.prizes || [],
      winners: next?.winners || [],
      entryTotal: Number(next?.entryTotal || 0),
      winnerTotal: Number(next?.winnerTotal || 0),
    }))
  }

  async function handleRevokeSongWishWinner(drawId) {
    setRevokeDrawId(drawId)
    setError('')
    try {
      await revokeSongWishLotteryDraw(activity.activityKey, drawId)
      await refreshSongWishResult()
      message.success('已撤销中奖记录，奖项名额已回补')
    } catch (err) {
      const text = err.message || '撤销中奖记录失败'
      setError(text)
      message.error(text)
    } finally {
      setRevokeDrawId('')
    }
  }

  async function handleClearSongWishWinners() {
    setClearingDraws(true)
    setError('')
    try {
      const data = await clearSongWishLotteryDraws(activity.activityKey)
      await refreshSongWishResult()
      message.success(`已清空 ${data?.cleared || 0} 条中奖记录，奖项名额已全部回补`)
    } catch (err) {
      const text = err.message || '清空中奖名单失败'
      setError(text)
      message.error(text)
    } finally {
      setClearingDraws(false)
    }
  }

  const prizeProbability = prizes.filter((item) => item.enabled).reduce((sum, item) => sum + Number(item.probability || 0), 0)
  const prizeColumns = [
    { title: '奖品名称', dataIndex: 'prizeName', width: 150, render: (value, _, index) => <Input value={value} onChange={(event) => updatePrize(index, { prizeName: event.target.value })} /> },
    { title: '等级', dataIndex: 'prizeLevel', width: 110, render: (value, _, index) => <Input value={value} onChange={(event) => updatePrize(index, { prizeLevel: event.target.value })} /> },
    { title: '图片 URL', dataIndex: 'prizeImage', width: 220, render: (value, _, index) => <Input value={value} onChange={(event) => updatePrize(index, { prizeImage: event.target.value })} /> },
    { title: '类型', dataIndex: 'prizeType', width: 110, render: (value, _, index) => <Select value={value} options={[{ value: 'win', label: '中奖' }, { value: 'thanks', label: '谢谢参与' }]} onChange={(prizeType) => updatePrize(index, { prizeType })} /> },
    { title: '概率 %', dataIndex: 'probability', width: 100, render: (value, _, index) => <InputNumber min={0} max={100} precision={2} value={value} onChange={(probability) => updatePrize(index, { probability: Number(probability || 0) })} /> },
    { title: '数量', dataIndex: 'quantity', width: 90, render: (value, _, index) => <InputNumber min={0} precision={0} value={value} disabled={prizes[index]?.prizeType === 'thanks'} onChange={(quantity) => updatePrize(index, { quantity: Number(quantity || 0) })} /> },
    { title: '已发/剩余', width: 92, render: (_, item) => `${item.issuedCount || 0}/${item.remainingCount || 0}` },
    { title: '启用', dataIndex: 'enabled', width: 70, render: (value, _, index) => <Switch size="small" checked={value} onChange={(enabled) => updatePrize(index, { enabled })} /> },
    { title: '', width: 62, render: (_, __, index) => <Popconfirm title="确认删除该奖项？" onConfirm={() => setPrizes((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Button danger type="link">删除</Button></Popconfirm> },
  ]

  const nanhaiProbability = nanhaiPrizes
    .filter((item) => item.enabled)
    .reduce((sum, item) => sum + Number(item.probability || 0), 0)
  const nanhaiProposedBudgetYuan = nanhaiPrizes.reduce(
    (sum, item) => sum + Number(item.amount || 0) * Number(item.quantity || 0),
    0,
  ) / 100
  const nanhaiApprovedLimitYuan = Number(nanhaiBudget?.approvedLimitYuan || 5000)
  const nanhaiBudgetOverLimit = nanhaiProposedBudgetYuan > nanhaiApprovedLimitYuan
  const nanhaiProbabilityOverLimit = nanhaiProbability > 100.0001
  const nanhaiMissProbability = Math.max(0, 100 - nanhaiProbability)
  const nanhaiPrizeColumns = [
    { title: '红包金额', dataIndex: 'amountYuan', width: 110, render: (value) => `${Number(value || 0)} 元` },
    { title: '奖品名称', dataIndex: 'prizeName', width: 170 },
    { title: '概率 %', dataIndex: 'probability', width: 120, render: (value, _, index) => <InputNumber min={0} max={100} step={0.01} precision={2} value={value} disabled={!nanhaiPrizes[index]?.enabled} onChange={(probability) => updateNanhaiPrize(index, { probability: Number(probability || 0) })} /> },
    { title: '总数量', dataIndex: 'quantity', width: 110, render: (value, item, index) => <InputNumber min={Number(item.issuedCount || 0) + Number(item.reservedCount || 0)} precision={0} value={value} onChange={(quantity) => updateNanhaiPrize(index, { quantity: Number(quantity || 0) })} /> },
    { title: '预占/已到账/剩余', width: 150, render: (_, item) => `${item.reservedCount || 0} / ${item.issuedCount || 0} / ${item.remainingCount || 0}` },
    { title: '启用', dataIndex: 'enabled', width: 80, render: (value, _, index) => <Switch size="small" checked={value} onChange={(enabled) => updateNanhaiPrize(index, { enabled })} /> },
  ]
  const nanhaiControlMode = {
    normal: { label: '正常抽奖', color: 'success' },
    paused: { label: '手动暂停', color: 'warning' },
    force_loss: { label: '强制未中奖', color: 'error' },
    auto_force_loss: { label: '自动强制未中奖', color: 'error' },
  }[nanhaiDrawControl.effectiveMode] || { label: '状态异常', color: 'error' }
  const nanhaiControlEventColumns = [
    { title: '时间', dataIndex: 'createdAt', width: 180, render: (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-' },
    { title: '来源', dataIndex: 'source', width: 90, render: (value) => value === 'admin' ? '后台' : '系统' },
    { title: '操作', dataIndex: 'action', width: 150 },
    { title: '状态', dataIndex: 'mode', width: 120 },
    { title: '原因', dataIndex: 'reason' },
  ]

  const songWishPrizeColumns = [
    { title: '奖项等级', dataIndex: 'prizeLevel', width: 130, render: (value, _, index) => <Input value={value} placeholder="如：一等奖" onChange={(event) => updateSongWishPrize(index, { prizeLevel: event.target.value })} /> },
    { title: '奖品名称', dataIndex: 'prizeName', width: 160, render: (value, _, index) => <Input value={value} onChange={(event) => updateSongWishPrize(index, { prizeName: event.target.value })} /> },
    { title: '奖品图片 OSS URL', dataIndex: 'prizeImage', width: 260, render: (value, _, index) => <Input value={value} onChange={(event) => updateSongWishPrize(index, { prizeImage: event.target.value })} /> },
    { title: '中奖名额', dataIndex: 'quantity', width: 100, render: (value, _, index) => <InputNumber min={0} precision={0} value={value} onChange={(quantity) => updateSongWishPrize(index, { quantity: Number(quantity || 0) })} /> },
    { title: '已发/剩余', width: 100, render: (_, item) => `${item.issuedCount || 0}/${item.remainingCount || 0}` },
    { title: '启用', dataIndex: 'enabled', width: 70, render: (value, _, index) => <Switch size="small" checked={value} onChange={(enabled) => updateSongWishPrize(index, { enabled })} /> },
    { title: '', width: 62, render: (_, item, index) => <Popconfirm title="确认删除该奖项？" disabled={Number(item.issuedCount || 0) > 0} onConfirm={() => setSongWishResult((current) => ({ ...current, prizes: current.prizes.filter((_, itemIndex) => itemIndex !== index) }))}><Button danger type="link" disabled={Number(item.issuedCount || 0) > 0}>删除</Button></Popconfirm> },
  ]

  const songWishWinnerColumns = [
    { title: '用户ID', dataIndex: 'userId', width: 110 },
    { title: '昵称', dataIndex: 'nickname', width: 130 },
    { title: 'OpenID', dataIndex: 'openid', width: 220, ellipsis: true },
    { title: '奖项', dataIndex: 'prizeLevel', width: 110 },
    { title: '奖品', dataIndex: 'prizeName', width: 160 },
    { title: '指定时间', dataIndex: 'createdAt', width: 170 },
    { title: '操作', width: 92, fixed: 'right', render: (_, item) => <Popconfirm title="撤销后将回补该奖项名额，确认撤销？" onConfirm={() => handleRevokeSongWishWinner(item.id)}><Button danger type="link" loading={revokeDrawId === item.id}>撤销</Button></Popconfirm> },
  ]

  return (
    <Card className="admin-card" loading={loading}>
      <div className="admin-page-head">
        <div>
          <Title level={4}>活动配置</Title>
          <Text type="secondary">通用移动端配置，当前先提供背景音乐能力，后续可复用到 quiz、video-rank、抽奖和其他活动。</Text>
        </div>
        <Button type="primary" onClick={handleSave} loading={saving}>
          保存配置
        </Button>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Card size="small" title="活动状态">
          <Space direction="vertical" size={12}>
            <Switch
              checked={activityStatus === 1}
              checkedChildren="启用"
              unCheckedChildren="停用"
              loading={statusSaving}
              onChange={handleStatusChange}
            />
            <Text type="secondary">
              停用后，活动公开页面将显示“活动暂未开放”，公共业务接口也会拒绝访问。
            </Text>
          </Space>
        </Card>

        {activity.type === 'nansha_open_mic' ? (
          <Card
            size="small"
            title="报名投票阶段"
            extra={<Button type="primary" loading={nanshaConfigSaving} onClick={handleSaveNanshaConfig}>保存阶段配置</Button>}
          >
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              <Alert
                type="info"
                showIcon
                message="阶段由后台手动切换"
                description="上传阶段仅在报名时间范围内允许报名；投票阶段展示审核通过的作品并开放投票；公示期仅展示投票结果排行榜；关闭阶段停止报名和投票。"
              />
              <Space wrap size={18}>
                <label>
                  <Text strong>当前阶段</Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      style={{ width: 180 }}
                      value={nanshaConfig.currentPhase}
                      options={[
                        { label: '第一阶段：上传报名', value: 'upload' },
                        { label: '第二阶段：作品投票', value: 'vote' },
                        { label: '第三阶段：投票结果公示', value: 'publicity' },
                        { label: '活动关闭', value: 'closed' },
                      ]}
                      onChange={(value) => setNanshaConfig((current) => ({ ...current, currentPhase: value }))}
                    />
                  </div>
                </label>
                <label>
                  <Text strong>报名开始时间</Text>
                  <div style={{ marginTop: 8 }}>
                    <Input
                      style={{ width: 210 }}
                      type="datetime-local"
                      value={nanshaConfig.uploadStartAt}
                      onChange={(event) => setNanshaConfig((current) => ({ ...current, uploadStartAt: event.target.value }))}
                    />
                  </div>
                </label>
                <label>
                  <Text strong>报名结束时间（首页倒计时）</Text>
                  <div style={{ marginTop: 8 }}>
                    <Input
                      style={{ width: 210 }}
                      type="datetime-local"
                      value={nanshaConfig.uploadEndAt}
                      onChange={(event) => setNanshaConfig((current) => ({ ...current, uploadEndAt: event.target.value }))}
                    />
                  </div>
                </label>
                <label>
                  <Text strong>每人每天票数</Text>
                  <div style={{ marginTop: 8 }}>
                    <InputNumber
                      min={1}
                      max={100}
                      value={nanshaConfig.dailyVoteLimit}
                      onChange={(value) => setNanshaConfig((current) => ({ ...current, dailyVoteLimit: Number(value || 10) }))}
                    />
                  </div>
                </label>
              </Space>
              <Card size="small" type="inner" title="危险操作">
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Text strong>删除指定作品上传记录</Text>
                  <Text type="secondary">用于处理单个用户上传失败或需要重新报名的情况。请输入数据表中的作品ID；仅删除该作品的报名记录、审核记录和关联投票，不影响其他用户、微信用户及活动配置。</Text>
                  <Space.Compact style={{ maxWidth: 420 }}>
                    <Input
                      placeholder="请输入作品ID"
                      value={nanshaDeleteEntryId}
                      onChange={(event) => setNanshaDeleteEntryId(event.target.value.replace(/\D/g, ''))}
                    />
                    <Popconfirm
                      title="确认删除该作品上传记录？"
                      description="删除后该用户可以重新上传，操作不可恢复。"
                      okText="确认删除"
                      cancelText="取消"
                      onConfirm={handleDeleteNanshaEntry}
                    >
                      <Button danger loading={nanshaDeletingEntry} disabled={!/^\d+$/.test(nanshaDeleteEntryId.trim())}>删除指定作品</Button>
                    </Popconfirm>
                  </Space.Compact>
                  <Text type="secondary">清空本活动全部报名作品、审核记录、投票记录、每日票数和参与用户；活动阶段、报名时间、每日票数配置及 OSS 原始视频文件会保留。</Text>
                  <Popconfirm
                    title="确认清空南沙新声全部业务数据？"
                    description="该操作不可恢复，清空后所有用户均可重新报名和投票。"
                    okText="确认清空"
                    cancelText="取消"
                    onConfirm={handleResetNanshaData}
                  >
                    <Button danger loading={nanshaResetting}>清空活动数据</Button>
                  </Popconfirm>
                </Space>
              </Card>
            </Space>
          </Card>
        ) : null}

        {activity.type === 'longwen_beer_quiz' ? (
          <Card size="small" title="答题数据管理">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Text type="secondary">清空本活动的全部答题、中奖和核销记录，同时移除参与记录；操作审计会保留。清空后用户可以重新参与。</Text>
              <Popconfirm
                title="确认清空龙文啤酒答题数据？"
                description="该操作不可恢复，已答题和已核销用户均可重新参与。"
                okText="确认清空"
                cancelText="取消"
                onConfirm={handleClearLongwenBeerQuizData}
              >
                <Button danger loading={longwenClearing}>清空答题数据</Button>
              </Popconfirm>
            </Space>
          </Card>
        ) : null}

        {activity.type === 'xiangyu_global_treasure' ? (
          <Card size="small" title="寻宝数据管理" style={{ borderColor: '#ffccc7' }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type="warning"
                showIcon
                message="清除后用户可立即重新参与"
                description="只删除本活动的单位名称、当天抽奖结果、核销记录与活动参与记录；不会删除微信用户、活动配置、操作审计或其他项目数据。"
              />
              <Space wrap>
                <Select
                  value={xiangyuClearScope}
                  style={{ width: 150 }}
                  options={[{ value: 'user', label: '清除指定用户' }, { value: 'all', label: '清除所有数据' }]}
                  onChange={setXiangyuClearScope}
                />
                {xiangyuClearScope === 'user' ? (
                  <Input
                    style={{ width: 230 }}
                    placeholder="请输入用户ID"
                    value={xiangyuUserId}
                    onChange={(event) => setXiangyuUserId(event.target.value.replace(/\D/g, ''))}
                  />
                ) : null}
                <Popconfirm
                  title={xiangyuClearScope === 'all' ? '确认清除象屿寻宝全部数据？' : '确认清除该用户的象屿寻宝数据？'}
                  description={xiangyuClearScope === 'all' ? '该操作不可恢复，所有用户将恢复为可参与状态；不会影响其他活动。' : `用户ID：${xiangyuUserId || '未填写'}；仅影响该用户的本活动抽奖与核销记录。`}
                  okText="确认清除"
                  cancelText="取消"
                  onConfirm={handleClearXiangyuGlobalTreasureData}
                >
                  <Button danger loading={xiangyuClearing} disabled={xiangyuClearScope === 'user' && !/^[1-9]\d*$/.test(xiangyuUserId.trim())}>
                    {xiangyuClearScope === 'all' ? '清除所有数据' : '清除指定用户'}
                  </Button>
                </Popconfirm>
              </Space>
            </Space>
          </Card>
        ) : null}

        {activity.type === 'rider_safety_survey' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" title="活动阶段" style={{ borderColor: riderSafetyTestMode ? '#ffe58f' : '#ffccc7' }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Alert
                  type={riderSafetyTestMode ? 'warning' : 'error'}
                  showIcon
                  message={riderSafetyTestMode ? '当前：测试阶段' : '当前：正式阶段'}
                  description={riderSafetyTestMode ? '抽奖只扣减测试库存，不会调用微信现金红包发放；可清除个人或全部测试数据。若曾有正式发放记录，真实红包流水、库存和预算会保留。' : '抽奖可能真实发放现金红包；允许按用户ID重置参与资格，保留资金流水和额度，禁止清除全部数据。'}
                />
                <Popconfirm
                  title={riderSafetyTestMode ? '确认切换至正式阶段？' : '确认切换回测试阶段？'}
                  description={riderSafetyTestMode ? '请先通过“清除全部数据”清空本活动测试参与、问卷、抽奖和测试红包记录；切换后将开启真实红包发放。' : '所有正式红包发放结束后即可切回测试阶段；已完成的真实红包流水、库存和预算将保留，不会影响测试。'}
                  okText="确认切换"
                  cancelText="取消"
                  onConfirm={() => handleRiderSafetyModeChange(riderSafetyTestMode ? 'formal' : 'test')}
                >
                  <Button danger={!riderSafetyTestMode} type={riderSafetyTestMode ? 'primary' : 'default'} loading={riderSafetyModeSaving}>
                    {riderSafetyTestMode ? '切换至正式阶段' : '切换至测试阶段'}
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
            <Card size="small" title="问卷数据清除" style={{ borderColor: '#ffccc7' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type="warning"
                showIcon
                message="仅限超级管理员；操作不可恢复"
                description={riderSafetyTestMode ? '测试阶段可清除个人或全部测试数据，并按保留的真实红包流水重新计算库存和预算。' : '正式阶段仅可清除指定用户的参与数据，使其重新参与；保留真实红包流水、库存和预算占用。处理中红包须结束后才能清除。'}
              />
              <Space wrap>
                <Select
                  value={riderSafetyClearScope}
                  style={{ width: 150 }}
                  options={[{ value: 'user', label: '清除指定用户' }, { value: 'all', label: '清除全部数据', disabled: !riderSafetyTestMode }]}
                  onChange={setRiderSafetyClearScope}
                />
                {riderSafetyClearScope === 'user' ? (
                  <Input
                    style={{ width: 230 }}
                    placeholder="请输入用户ID"
                    value={riderSafetyUserId}
                    onChange={(event) => setRiderSafetyUserId(event.target.value.replace(/\D/g, ''))}
                  />
                ) : null}
                <Popconfirm
                  title={riderSafetyClearScope === 'all' ? '确认清除本活动全部问卷数据？' : '确认清除该用户的问卷数据？'}
                  description={riderSafetyClearScope === 'all' ? '清除全部测试参与数据；不会删除微信用户、活动配置、其他活动数据或已完成的真实红包流水。红包库存和预算将按保留流水重新计算。' : `用户ID：${riderSafetyUserId || '未填写'}；${riderSafetyTestMode ? '清除测试参与数据，并按保留的真实红包流水重新计算库存' : '重置参与资格，保留真实红包流水及库存、预算消耗，再次抽奖可能再次真实发放红包'}。`}
                  okText="确认清除"
                  cancelText="取消"
                  onConfirm={handleClearRiderSafetySurveyData}
                >
                  <Button danger loading={riderSafetyClearing} disabled={(!riderSafetyTestMode && riderSafetyClearScope !== 'user') || (riderSafetyClearScope === 'user' && !/^[1-9]\d*$/.test(riderSafetyUserId.trim()))}>
                    {riderSafetyClearScope === 'all' ? '清除全部数据' : '清除指定用户'}
                  </Button>
                </Popconfirm>
              </Space>
            </Space>
            </Card>
          </Space>
        ) : null}

        <Card size="small" title="移动端音效配置">
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="活动级通用配置"
              description="保存到 activity.mobile_config_json.bgm。quiz、video-rank、抽奖、大屏、小游戏等活动都可以复用同一套背景音乐能力。"
            />

            <Space wrap size={18}>
              <label><Text strong>开启背景音乐</Text><div style={{ marginTop: 8 }}><Switch checked={bgm.enabled} onChange={(checked) => setBgm((value) => ({ ...value, enabled: checked }))} /></div></label>
              <label><Text strong>循环播放</Text><div style={{ marginTop: 8 }}><Switch checked={bgm.loop} onChange={(checked) => setBgm((value) => ({ ...value, loop: checked }))} /></div></label>
              <label><Text strong>自动播放</Text><div style={{ marginTop: 8 }}><Switch checked={bgm.autoplay} onChange={(checked) => setBgm((value) => ({ ...value, autoplay: checked }))} /></div></label>
              <label><Text strong>显示音乐按钮</Text><div style={{ marginTop: 8 }}><Switch checked={bgm.showControl} onChange={(checked) => setBgm((value) => ({ ...value, showControl: checked }))} /></div></label>
            </Space>

            <div>
              <Text strong>音乐 URL</Text>
              <Input
                value={bgm.url}
                onChange={(event) => setBgm((value) => ({ ...value, url: event.target.value }))}
                placeholder="https://assets.zice8.com/common/audio/bgm.mp3"
                style={{ marginTop: 8, maxWidth: 760 }}
              />
            </div>

            <div>
              <Text strong>音量</Text>
              <div style={{ marginTop: 8 }}>
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  value={bgm.volume}
                  onChange={(value) => setBgm((current) => ({ ...current, volume: Number(value ?? 0.6) }))}
                />
              </div>
            </div>
          </Space>
        </Card>

        {activity.type === 'nanhai_inspection_challenge' ? (
          <Card
            size="small"
            title="抽奖风控与熔断"
            extra={<Tag color={nanhaiControlMode.color}>{nanhaiControlMode.label}</Tag>}
          >
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              <Alert
                type={nanhaiDrawControl.effectiveMode === 'normal' ? 'info' : 'warning'}
                showIcon
                message={`当前状态：${nanhaiControlMode.label}`}
                description={nanhaiDrawControl.effectiveMode === 'auto_force_loss'
                  ? `${nanhaiDrawControl.autoReason || '短时中奖异常'}。在恢复前，所有新抽奖都会固定未中奖并消耗机会；预计恢复时间：${nanhaiDrawControl.autoPausedUntil ? new Date(nanhaiDrawControl.autoPausedUntil).toLocaleString('zh-CN', { hour12: false }) : '等待系统确认'}`
                  : nanhaiDrawControl.effectiveMode === 'paused'
                    ? '新用户抽奖会收到“活动暂时维护中”，不会生成抽奖记录，也不会消耗抽奖机会。'
                    : nanhaiDrawControl.effectiveMode === 'force_loss'
                      ? '所有新抽奖都会生成未中奖记录并消耗一次机会；已产生的中奖和发放单仍继续处理。'
                      : '按现有概率、库存、预算、IP 上限和自动熔断规则正常抽奖。'}
              />

              <Input.TextArea
                rows={2}
                maxLength={255}
                showCount
                value={nanhaiControlReason}
                onChange={(event) => setNanhaiControlReason(event.target.value)}
                placeholder="暂停或强制未中奖前必须填写原因，操作会写入审计日志"
              />
              <Space wrap>
                <Popconfirm
                  title="确认恢复正常抽奖？"
                  description="恢复后，新用户将重新按概率、库存和预算参与抽奖。"
                  onConfirm={() => handleNanhaiControlAction('resume')}
                >
                  <Button type="primary" disabled={!nanhaiControlLoaded} loading={nanhaiControlSaving}>恢复正常</Button>
                </Popconfirm>
                <Popconfirm
                  title="确认暂停抽奖？"
                  description="暂停期间不会生成抽奖记录，也不会消耗用户机会。"
                  onConfirm={() => handleNanhaiControlAction('pause')}
                >
                  <Button disabled={!nanhaiControlLoaded} loading={nanhaiControlSaving}>暂停且保留机会</Button>
                </Popconfirm>
                <Popconfirm
                  title="确认让所有新抽奖都未中奖？"
                  description="该操作会消耗用户唯一一次抽奖机会，只建议在明确止损时使用。"
                  onConfirm={() => handleNanhaiControlAction('force_loss')}
                >
                  <Button danger disabled={!nanhaiControlLoaded} loading={nanhaiControlSaving}>强制全部未中奖</Button>
                </Popconfirm>
              </Space>

              <Card size="small" type="inner" title="自动熔断参数">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space wrap size={20}>
                    <label>
                      <Text strong>启用自动熔断</Text>
                      <div style={{ marginTop: 8 }}>
                        <Switch
                          disabled={!nanhaiControlLoaded}
                          checked={Boolean(nanhaiDrawControl.autoEnabled)}
                          onChange={(autoEnabled) => setNanhaiDrawControl((current) => ({ ...current, autoEnabled }))}
                        />
                      </div>
                    </label>
                    <label>
                      <Text strong>统计窗口（秒）</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={60} max={3600} precision={0} value={nanhaiDrawControl.windowSeconds} onChange={(windowSeconds) => setNanhaiDrawControl((current) => ({ ...current, windowSeconds: Number(windowSeconds || 60) }))} />
                      </div>
                    </label>
                    <label>
                      <Text strong>窗口中奖人数上限</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={1} max={10000} precision={0} value={nanhaiDrawControl.maxWinCount} onChange={(maxWinCount) => setNanhaiDrawControl((current) => ({ ...current, maxWinCount: Number(maxWinCount || 1) }))} />
                      </div>
                    </label>
                    <label>
                      <Text strong>单 IP 中奖上限</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={1} max={1000} precision={0} value={nanhaiDrawControl.maxWinsPerIp} onChange={(maxWinsPerIp) => setNanhaiDrawControl((current) => ({ ...current, maxWinsPerIp: Number(maxWinsPerIp || 1) }))} />
                      </div>
                    </label>
                    <label>
                      <Text strong>窗口中奖金额上限（元）</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={0.01} max={5000} precision={2} value={Number(nanhaiDrawControl.maxWinAmountFen || 0) / 100} onChange={(value) => setNanhaiDrawControl((current) => ({ ...current, maxWinAmountFen: Math.round(Number(value || 0.01) * 100) }))} />
                      </div>
                    </label>
                    <label>
                      <Text strong>自动恢复冷却（秒）</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={60} max={86400} precision={0} value={nanhaiDrawControl.cooldownSeconds} onChange={(cooldownSeconds) => setNanhaiDrawControl((current) => ({ ...current, cooldownSeconds: Number(cooldownSeconds || 60) }))} />
                      </div>
                    </label>
                  </Space>
                  <Text type="secondary">
                    同一出口网络累计中奖满 {Number(nanhaiDrawControl.maxWinsPerIp || 0)} 人后，该 IP 后续只会未中奖；最近 {nanhaiDrawControl.windowSeconds} 秒已承诺中奖 {Number(nanhaiDrawControl.recentMetrics?.winCount || 0)} 人、{(Number(nanhaiDrawControl.recentMetrics?.winAmountFen || 0) / 100).toFixed(2)} 元。达到自动熔断任一阈值后会切换为全部未中奖并消耗机会；冷却结束后自动恢复。
                  </Text>
                  <Button type="primary" disabled={!nanhaiControlLoaded} loading={nanhaiControlSaving} onClick={handleSaveNanhaiAutoControl}>保存风控参数</Button>
                </Space>
              </Card>

              <Card size="small" type="inner" title={`最近控制记录（累计自动触发 ${Number(nanhaiDrawControl.autoTriggerCount || 0)} 次）`}>
                <Table rowKey="id" columns={nanhaiControlEventColumns} dataSource={nanhaiDrawControl.events || []} pagination={false} size="small" scroll={{ x: 760 }} />
              </Card>
            </Space>
          </Card>
        ) : null}

        {activity.type === 'artist_call_lottery' ? (
          <Card size="small" title="抽奖奖品配置" extra={<Space><Text type={Math.abs(prizeProbability - 100) < 0.001 ? 'success' : 'danger'}>启用概率：{prizeProbability.toFixed(2)}%</Text><Button type="primary" loading={prizeSaving} onClick={handleSavePrizes}>保存奖品</Button></Space>}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert type="info" showIcon message="概率与库存独立管理" description="概率决定抽中哪个奖项；数量为可发放上限。谢谢参与也需要配置概率，启用奖项总概率必须为 100%。" />
              <Table rowKey={(item, index) => item.id || `new-${index}`} columns={prizeColumns} dataSource={prizes} pagination={false} size="small" scroll={{ x: 1120 }} />
              <Button onClick={addPrize}>新增奖项</Button>
            </Space>
          </Card>
        ) : null}

        {activity.type === 'nanhai_inspection_challenge' ? (
          <Card
            size="small"
            title="微信红包数量与概率"
            extra={<Space wrap><Text type={nanhaiProbabilityOverLimit ? 'danger' : 'success'}>红包概率 {nanhaiProbability.toFixed(2)}%</Text><Text type={nanhaiProbabilityOverLimit ? 'danger' : 'secondary'}>谢谢参与 {nanhaiMissProbability.toFixed(2)}%</Text><Text type={nanhaiBudgetOverLimit ? 'danger' : 'success'}>本次释放 {nanhaiProposedBudgetYuan.toFixed(2)} / 上限 {nanhaiApprovedLimitYuan.toFixed(2)} 元</Text><Button type="primary" loading={nanhaiPrizeSaving} disabled={nanhaiBudgetOverLimit || nanhaiProbabilityOverLimit} onClick={handleSaveNanhaiPrizes}>保存红包配置</Button></Space>}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert type={nanhaiBudgetOverLimit || nanhaiProbabilityOverLimit ? 'error' : 'info'} showIcon message="保存库存时自动同步释放预算" description={`红包概率可配置为 0–100%，剩余 ${nanhaiMissProbability.toFixed(2)}% 自动为谢谢参与。红包金额固定；本次库存对应 ${nanhaiProposedBudgetYuan.toFixed(2)} 元，保存后即成为抽奖可消费的硬预算，且永远不能超过 ${nanhaiApprovedLimitYuan.toFixed(2)} 元。当前已支出 ${Number(nanhaiBudget?.spentAmountFen || 0) / 100} 元、预占 ${Number(nanhaiBudget?.reservedAmountFen || 0) / 100} 元。`} />
              <Table rowKey="id" columns={nanhaiPrizeColumns} dataSource={nanhaiPrizes} pagination={false} size="small" scroll={{ x: 720 }} />
            </Space>
          </Card>
        ) : null}

        {activity.type === 'nanhai_inspection_challenge' ? (
          <Card size="small" title="参与数据重置" style={{ borderColor: '#ffccc7' }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type="warning"
                showIcon
                message="仅清除本活动范围内的本地参与、答题、抽奖和商家转账授权记录"
                description="不会影响其他用户或其他项目。若目标范围存在发放中或已成功发放的红包，系统会拒绝清除，避免无法查单或重复发放；删除本地授权记录不会撤回微信侧已经完成的授权。"
              />
              <Space wrap>
                <Input
                  value={nanhaiResetUserId}
                  onChange={(event) => setNanhaiResetUserId(event.target.value.replace(/\D/g, ''))}
                  placeholder="输入指定用户ID"
                  style={{ width: 200 }}
                />
                <Popconfirm
                  title="确认清除该用户的幸福南海数据？"
                  description="将清除该用户的答题、抽奖、本地转账授权与参与记录；其他用户及其他项目不受影响。"
                  okText="确认清除"
                  cancelText="取消"
                  onConfirm={handleResetNanhaiData}
                >
                  <Button danger loading={nanhaiResetting} disabled={!/^[1-9]\d*$/.test(nanhaiResetUserId.trim())}>清除指定用户</Button>
                </Popconfirm>
              </Space>
            </Space>
          </Card>
        ) : null}

        {activity.type === 'nanhai_inspection_challenge' ? (
          <Card size="small" title="广东地区人工放行" style={{ borderColor: '#91caff' }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert
                type="info"
                showIcon
                message="仅在核验用户确属广东省参与者、但 IP 归属地异常时使用"
                description="输入用户ID和核验原因后可一键放行。放行只对该用户、该活动有效；IP仍会继续记录。授权与撤销均写入后台审计日志。"
              />
              <Space wrap align="start">
                <Input
                  value={nanhaiRegionUserId}
                  onChange={(event) => setNanhaiRegionUserId(event.target.value.replace(/\D/g, ''))}
                  placeholder="用户ID"
                  style={{ width: 180 }}
                />
                <Input
                  value={nanhaiRegionReason}
                  onChange={(event) => setNanhaiRegionReason(event.target.value)}
                  placeholder="核验原因，例如：电话确认广东省单位员工"
                  maxLength={255}
                  style={{ width: 300 }}
                />
                <Popconfirm
                  title="确认人工放行该用户？"
                  description="该用户将绕过广东省 IP 限制，但其他风控和抽奖限制仍然有效。"
                  okText="确认放行"
                  cancelText="取消"
                  onConfirm={() => handleNanhaiRegionAccess('allow')}
                >
                  <Button type="primary" loading={nanhaiRegionSaving} disabled={!/^[1-9]\d*$/.test(nanhaiRegionUserId.trim()) || nanhaiRegionReason.trim().length < 2}>一键放行</Button>
                </Popconfirm>
              </Space>
              <Table
                rowKey="userId"
                size="small"
                pagination={false}
                scroll={{ x: 760 }}
                dataSource={nanhaiRegionExemptions}
                columns={[
                  { title: '用户ID', dataIndex: 'userId', width: 130 },
                  { title: '核验原因', dataIndex: 'reason' },
                  { title: '授权时间', dataIndex: 'approvedAt', width: 190 },
                  { title: '操作', width: 120, render: (_, row) => <Popconfirm title="确认撤销该用户的人工放行？" onConfirm={() => handleNanhaiRegionAccess('revoke', row.userId)}><Button danger size="small" loading={nanhaiRegionSaving}>撤销</Button></Popconfirm> },
                ]}
              />
            </Space>
          </Card>
        ) : null}

        {activity.type === 'song_wish_lottery' ? (
          <Card
            size="small"
            title="歌曲许愿开奖配置"
            extra={<Space><Text type="secondary">入池 {songWishResult.entryTotal} 人 · 已中奖 {songWishResult.winnerTotal} 人</Text><Button type="primary" loading={songWishSaving} onClick={handleSaveSongWishResult}>保存配置</Button></Space>}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Alert type="info" showIcon message="定时公布，手动指定中奖" description="默认公布时间为 7 月 29 日。公布前前台只显示“未开奖”，不会泄露已指定的中奖结果；公布后未被指定的入池用户自动显示“未中奖”。" />
              <label className="admin-field-block">
                <Text strong>开奖公布时间（北京时间）</Text>
                <Input type="datetime-local" value={songWishResult.publishAt} onChange={(event) => setSongWishResult((current) => ({ ...current, publishAt: event.target.value }))} style={{ maxWidth: 260, marginTop: 8 }} />
              </label>
              <Table rowKey={(item, index) => item.id || `song-wish-prize-${index}`} columns={songWishPrizeColumns} dataSource={songWishResult.prizes} pagination={false} size="small" scroll={{ x: 1080 }} />
              <Button onClick={addSongWishPrize}>新增奖项</Button>
              <Alert type="warning" showIcon message="批量手动开奖" description="请先保存奖项配置。把甲方随机抽取的 OpenID 或用户ID 粘贴到下方，支持换行、逗号或空格分隔；系统会自动跳过未入池、重复中奖和名额已满的用户。" />
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Select value={manualPrizeId || undefined} placeholder="选择要发放的奖项" onChange={setManualPrizeId} options={songWishResult.prizes.filter((item) => item.enabled && Number(item.remainingCount || item.quantity || 0) > 0).map((item) => ({ value: item.id, label: `${item.prizeLevel} · ${item.prizeName}（剩余 ${item.remainingCount ?? item.quantity}）` }))} style={{ maxWidth: 420 }} />
                <Input.TextArea value={manualTargets} onChange={(event) => setManualTargets(event.target.value)} rows={5} placeholder="粘贴 OpenID 或用户ID，一行一个；也支持逗号、空格分隔" />
                <Button type="primary" loading={manualDrawing} onClick={handleManualDraw}>批量指定中奖用户</Button>
              </Space>
              <div className="admin-page-head" style={{ marginTop: 8 }}>
                <div>
                  <Text strong>已指定中奖名单</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>撤销或清空会自动回补对应奖项名额</Text>
                </div>
                <Popconfirm
                  title={`确认清空全部 ${songWishResult.winnerTotal} 条中奖记录？`}
                  description="清空后所有用户恢复为未中奖，奖项名额会全部回补。"
                  disabled={!songWishResult.winnerTotal}
                  onConfirm={handleClearSongWishWinners}
                >
                  <Button danger disabled={!songWishResult.winnerTotal} loading={clearingDraws}>清空中奖名单</Button>
                </Popconfirm>
              </div>
              <Table rowKey="id" columns={songWishWinnerColumns} dataSource={songWishResult.winners} pagination={songWishResult.winnerTotal > 500 ? { pageSize: 50 } : false} size="small" scroll={{ x: 1000 }} />
            </Space>
          </Card>
        ) : null}
      </Space>
    </Card>
  )
}

function toDateTimeInput(value) {
  return String(value || '').replace(' ', 'T').slice(0, 16) || '2026-07-29T00:00'
}

function toOptionalDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function toOptionalDateTimeISOString(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
