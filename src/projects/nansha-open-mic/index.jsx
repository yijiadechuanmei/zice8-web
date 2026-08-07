import './styles.css'

export default function NanshaOpenMicProject({ routeParams }) {
  return (
    <main
      className="nansha-open-mic-root"
      data-activity-key={routeParams?.activityKey || ''}
      aria-label="南沙新声·全民开麦"
    />
  )
}
