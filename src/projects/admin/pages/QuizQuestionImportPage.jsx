import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Descriptions, Input, Radio, Space, Table, Typography, Upload, message } from 'antd'
import { InboxOutlined, UploadOutlined } from '@ant-design/icons'
import { clearQuizQuestions, importQuizQuestions } from '../api'

const { Dragger } = Upload
const { Text, Title } = Typography

const templateHeaders = '题目 / 图片 / 选项A / 选项B / 选项C / 选项D / 正确答案 / 分数 / 题型 / 备注'
const CLEAR_CONFIRM_TEXT = 'CLEAR_QUIZ_QUESTIONS'

export default function QuizQuestionImportPage({ activity, lockActivityKey = false }) {
  const [activityKey, setActivityKey] = useState(activity?.activityKey || '')
  const [mode, setMode] = useState('replace')
  const [fileList, setFileList] = useState([])
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [result, setResult] = useState(null)
  const [clearResult, setClearResult] = useState(null)
  const [clearConfirm, setClearConfirm] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setActivityKey(activity?.activityKey || '')
    setResult(null)
    setClearResult(null)
    setClearConfirm('')
    setError('')
    setFileList([])
  }, [activity?.activityKey])

  const selectedFile = fileList[0]?.originFileObj || fileList[0] || null
  const detailRows = useMemo(() => {
    const errors = (result?.data?.errors || []).map((item, index) => ({ ...item, kind: '错误', key: `error-${index}` }))
    const warnings = (result?.data?.warnings || []).map((item, index) => ({ ...item, kind: '警告', key: `warning-${index}` }))
    return [...errors, ...warnings]
  }, [result])

  async function handleImport() {
    if (!activityKey.trim()) {
      setError('请输入 activityKey')
      return
    }
    if (!selectedFile) {
      setError('请上传 .xlsx 题库文件')
      return
    }
    setImporting(true)
    setError('')
    setResult(null)
    try {
      const data = await importQuizQuestions(activityKey.trim(), selectedFile, mode)
      setResult(data)
      if (data?.success) {
        message.success('题库导入完成')
      } else {
        message.error(data?.message || '题库导入失败')
      }
    } catch (err) {
      const responseBody = err?.response?.data || null
      const responseMessage = err?.response?.message || ''
      const nextResult = responseBody ? { ...responseBody, message: responseMessage || err.message || '题库导入失败' } : null
      const errorCode = responseBody?.errorCode
      let text = responseMessage || err.message || '题库导入失败'

      if (errorCode === 'clear_attempt_required') {
        text = '当前活动已有答题记录，不允许 replace。请先清空测试答题数据，或改用 append。'
      } else if (!responseBody && (!err?.response || err?.response?.code >= 500)) {
        text = '导入失败，请查看服务端日志'
      }

      if (nextResult) {
        setResult(nextResult)
      }
      setError(text)
      message.error(text)
    } finally {
      setImporting(false)
    }
  }

  async function handleClear() {
    if (!activityKey.trim()) {
      setError('缺少 activityKey，无法清空题库')
      return
    }
    if (clearConfirm.trim() !== CLEAR_CONFIRM_TEXT) {
      setError(`请输入 ${CLEAR_CONFIRM_TEXT} 后再清空题库`)
      return
    }
    if (!window.confirm('确认清空当前活动题库数据？仅删除题目、选项、分类，不删除参与用户和答题记录。')) {
      return
    }

    setClearing(true)
    setError('')
    setClearResult(null)
    try {
      const data = await clearQuizQuestions(activityKey.trim(), CLEAR_CONFIRM_TEXT)
      setClearResult({ success: true, message: '题库清空完成', data })
      setResult(null)
      message.success('题库清空完成，可以继续导入 Excel')
    } catch (err) {
      const responseBody = err?.response?.data || null
      const responseMessage = err?.response?.message || ''
      let text = responseMessage || err.message || '题库清空失败'

      if (responseBody?.errorCode === 'clear_attempt_required') {
        text = '当前活动已有答题记录，不允许清空题库，请先清空测试答题数据或新建活动。'
      }

      setClearResult(
        responseBody
          ? { success: false, message: responseMessage || text, data: responseBody }
          : null,
      )
      setError(text)
      message.error(text)
    } finally {
      setClearing(false)
    }
  }

  return (
    <Card className="admin-card">
      <div className="admin-page-head">
        <div>
          <Title level={4}>Quiz 题库导入</Title>
          <Text type="secondary">上传 Excel 后导入到指定 quiz activity。</Text>
        </div>
        <Button type="primary" icon={<UploadOutlined />} loading={importing} onClick={handleImport}>
          导入题库
        </Button>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="Excel 模板字段"
          description={
            <Space direction="vertical" size={4}>
              <Text>{templateHeaders}</Text>
              <Text type="secondary">题型：单选 / 多选；正确答案：单选填 A/B/C/D，多选填 ABCD 或 A,B；备注作为分类；分数为空默认 10；图片字段第一版可空。</Text>
            </Space>
          }
        />

        <Card size="small">
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            {lockActivityKey ? null : (
              <div>
                <Text strong>Activity Key</Text>
                <Input
                  value={activityKey}
                  onChange={(event) => setActivityKey(event.target.value)}
                  placeholder="输入 quiz activityKey"
                  style={{ marginTop: 8, maxWidth: 520 }}
                />
              </div>
            )}

            <div>
              <Text strong>导入模式</Text>
              <div style={{ marginTop: 8 }}>
                <Radio.Group value={mode} onChange={(event) => setMode(event.target.value)}>
                  <Radio.Button value="append">append 追加/更新</Radio.Button>
                  <Radio.Button value="replace">replace 替换旧题库</Radio.Button>
                </Radio.Group>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  append 不会删除旧题，适合补充或修正题目；replace 会删除当前活动旧题库并导入新题库，适合正式题库替换 demo 题库，已有答题记录时会被后端拒绝。
                </Text>
              </div>
            </div>

            <Dragger
              accept=".xlsx,.xls"
              maxCount={1}
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: nextFileList }) => {
                setFileList(nextFileList.slice(-1))
                setResult(null)
                setError('')
              }}
              onRemove={() => setFileList([])}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">点击或拖拽上传 .xlsx / .xls 题库</p>
              <p className="ant-upload-hint">不会上传图片文件；Excel 中“图片”列会作为题目图片 URL 文本导入。</p>
            </Dragger>
          </Space>
        </Card>

        <Card size="small" title="清空题库数据">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="warning"
              showIcon
              message="危险操作"
              description="仅删除当前活动的题目、选项、分类，不删除参与用户和答题记录。若当前活动已有答题记录，系统将拒绝清空。"
            />
            <div>
              <Text strong>请输入确认文本</Text>
              <Input
                value={clearConfirm}
                onChange={(event) => setClearConfirm(event.target.value)}
                placeholder={CLEAR_CONFIRM_TEXT}
                style={{ marginTop: 8, maxWidth: 360 }}
              />
            </div>
            <Space wrap>
              <Button
                danger
                onClick={handleClear}
                loading={clearing}
                disabled={clearConfirm.trim() !== CLEAR_CONFIRM_TEXT}
              >
                清空当前题库
              </Button>
              <Text type="secondary">清空成功后可直接继续上传 Excel 导入新题库。</Text>
            </Space>

            {clearResult ? (
              clearResult.success ? (
                <Alert
                  type="success"
                  showIcon
                  message="题库已清空"
                  description={`已删除选项 ${clearResult.data?.deletedOptions ?? 0} 条，题目 ${clearResult.data?.deletedQuestions ?? 0} 条，分类 ${clearResult.data?.deletedCategories ?? 0} 条。`}
                />
              ) : (
                <Alert
                  type="error"
                  showIcon
                  message={clearResult.message || '题库清空失败'}
                  description={
                    clearResult.data?.errorCode === 'clear_attempt_required'
                      ? `attemptCount=${clearResult.data?.attemptCount ?? 0}，answerRecordCount=${clearResult.data?.answerRecordCount ?? 0}，rankCount=${clearResult.data?.rankCount ?? 0}`
                      : null
                  }
                />
              )
            ) : null}
          </Space>
        </Card>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {result ? (
          <Card size="small" title={result.success ? '导入结果' : '导入未执行'}>
            {result.success ? null : <Alert style={{ marginBottom: 16 }} type="error" showIcon message={result.message || '题库导入失败'} />}
            <Descriptions bordered size="small" column={3}>
              <Descriptions.Item label="模式">{result.data?.mode || '-'}</Descriptions.Item>
              <Descriptions.Item label="总行数">{result.data?.totalRows ?? 0}</Descriptions.Item>
              <Descriptions.Item label="有效题数">{result.data?.validRows ?? 0}</Descriptions.Item>
              <Descriptions.Item label="成功题数">{result.data?.importedQuestions ?? 0}</Descriptions.Item>
              <Descriptions.Item label="分类数">{result.data?.importedCategories ?? 0}</Descriptions.Item>
              <Descriptions.Item label="跳过行数">{result.data?.skippedRows ?? 0}</Descriptions.Item>
              <Descriptions.Item label="错误数">{result.data?.errors?.length ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Warning 数">{result.data?.warnings?.length ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Activity Key">{result.data?.activityKey || activityKey}</Descriptions.Item>
            </Descriptions>

            <Table
              style={{ marginTop: 16 }}
              size="small"
              rowKey="key"
              columns={[
                { title: '类型', dataIndex: 'kind', key: 'kind', width: 90 },
                { title: '行号', dataIndex: 'row', key: 'row', width: 90 },
                { title: '字段', dataIndex: 'field', key: 'field', width: 140 },
                { title: '说明', dataIndex: 'message', key: 'message' },
              ]}
              dataSource={detailRows}
              pagination={{ pageSize: 8 }}
            />
          </Card>
        ) : null}
      </Space>
    </Card>
  )
}
