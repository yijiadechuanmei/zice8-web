export default function QuestionHeader({ title, bookImageUrl, onBack }) {
  return (
    <header className="relative z-10 h-[280px] overflow-hidden">
      <button
        className="absolute left-6 top-[58px] flex h-10 w-10 items-center justify-center rounded-full text-white/95 transition active:scale-95"
        type="button"
        onClick={onBack}
        aria-label="返回"
      >
        <span className="block h-3 w-3 rotate-45 border-l-[3px] border-b-[3px] border-current" />
      </button>

      <div className="relative flex h-full items-start justify-center">
        <div className="pt-[120px] text-center text-white">
          <h1 className="text-[44px] font-extrabold leading-none tracking-[0.04em] drop-shadow-[0_2px_8px_rgba(19,77,180,0.22)]">
            {title}
          </h1>
        </div>

        <div className="absolute right-6 top-[84px] h-[132px] w-[216px]">
          <div className="absolute left-0 top-[42px] h-[76px] w-[122px] rounded-[18px] bg-white/92 shadow-[0_12px_28px_rgba(16,78,185,0.14)]" />
          <div className="absolute left-[16px] top-[30px] h-[88px] w-[130px] rounded-[16px] bg-gradient-to-br from-white to-[#f3f8ff] shadow-[0_10px_20px_rgba(16,78,185,0.10)]" />
          <div className="absolute left-[8px] top-[52px] h-[40px] w-[18px] rounded-full bg-[#ffca4f] shadow-[0_0_0_4px_rgba(255,255,255,0.38)]" />
          <div className="absolute left-[36px] top-[26px] h-[64px] w-[82px] rounded-[4px] border-[3px] border-[#ffd46e] bg-white/90 shadow-[0_6px_14px_rgba(14,62,160,0.10)]" />
          <div className="absolute left-[48px] top-[34px] h-[48px] w-[2px] bg-[#e6efff]" />
          <div className="absolute left-[68px] top-[34px] h-[48px] w-[2px] bg-[#e6efff]" />
          <div className="absolute left-[36px] top-[38px] h-[2px] w-[82px] bg-[#e6efff]" />
          <div className="absolute left-[112px] top-[24px] h-[58px] w-[14px] rotate-[22deg] rounded-full bg-[#ffb63d]" />
          <div className="absolute left-[118px] top-[22px] h-[62px] w-[14px] rotate-[22deg] rounded-full bg-[#ffcf64]" />
          <div className="absolute left-[102px] top-[74px] h-[24px] w-[44px] rounded-[999px] bg-[#ffe7ab]/80 blur-sm" />
          <img
            className="absolute left-0 top-0 h-full w-full object-contain"
            src={bookImageUrl}
            alt=""
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[84px] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.42)_52%,rgba(255,255,255,0.92)_100%)]" />
    </header>
  )
}
