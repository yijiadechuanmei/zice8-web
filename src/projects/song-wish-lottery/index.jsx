import './styles.css'
import ArtistCallLotteryProject from '../artist-call-lottery/index.jsx'

export default function SongWishLotteryProject(props) {
  return (
    <div className="swl-copy-shell">
      <ArtistCallLotteryProject {...props} />
    </div>
  )
}
