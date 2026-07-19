import './styles.css'
import ArtistCallLotteryProject from '../artist-call-lottery/index.jsx'
import { songWishApi } from './api'

export default function SongWishLotteryProject(props) {
  return (
    <div className="swl-copy-shell">
      <ArtistCallLotteryProject {...props} variant="songWish" projectApi={songWishApi} />
    </div>
  )
}
