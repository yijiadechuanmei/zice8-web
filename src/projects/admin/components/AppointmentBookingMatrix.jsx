import { Table, Tag } from 'antd'

export default function AppointmentBookingMatrix({ matrix }) {
  const slots = matrix?.slots || []
  const rows = matrix?.rows || []
  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      fixed: 'left',
      width: 140,
    },
    ...slots.map((slot) => ({
      title: slot,
      dataIndex: ['slots', slot],
      key: slot,
      width: 120,
      align: 'center',
      render: (value) => <Tag color={Number(value || 0) > 0 ? 'blue' : 'default'}>{Number(value || 0)}</Tag>,
    })),
  ]

  return (
    <Table
      rowKey="date"
      size="small"
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={columns}
      dataSource={rows}
    />
  )
}
