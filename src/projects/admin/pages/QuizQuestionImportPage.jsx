import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Descriptions, Input, Radio, Space, Table, Typography, Upload, message } from 'antd'
import { InboxOutlined, UploadOutlined } from '@ant-design/icons'
import { importQuizQuestions } from '../api'

const { Dragger } = Upload
const { Text, Title } = Typography

const templateHeaders = '题目 / 图片 / 选项A / 选项B / 选项C / 选项D / 正确答案 / 分数 / 题型 / 备注'

export default function QuizQuestionImportPage({ activity, lockActivityKey = false }) {
  const [activityKey, setActivityKey] = useState(activity?.activityKey || '')
  const [mode, setMode] = useState('replace')
  const [fileList, setFileList] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setActivityKey(activity?.activityKey || '')
    setResult(null)
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
      const text = err.message || '题库导入失败'
      setError(text)
      message.error(text)
    } finally {
      setImporting(false)
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
              accept=".xlsx"
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
              <p className="ant-upload-text">点击或拖拽上传 .xlsx 题库</p>
              <p className="ant-upload-hint">不会上传图片文件；Excel 中“图片”列会作为题目图片 URL 文本导入。</p>
            </Dragger>
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
