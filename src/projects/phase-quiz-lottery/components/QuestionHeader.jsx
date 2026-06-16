export default function QuestionHeader({ title, bookImageUrl, onBack }) {
  return (
    <header className="pql-question-header relative z-10 h-[360px] overflow-hidden">
      <button
        className="absolute left-[32px] top-[64px] z-30 flex h-[56px] w-[56px] items-center justify-center rounded-full text-white/95 transition active:scale-95"
        type="button"
        onClick={onBack}
        aria-label="返回"
      >
        <span className="block h-[18px] w-[18px] rotate-45 border-l-[4px] border-b-[4px] border-current" />
      </button>

      <div className="pql-question-header__content absolute inset-0 z-20">
        <div className="absolute left-0 right-0 top-[126px] text-center text-white">
          <h1 className="text-[40px] font-extrabold leading-none tracking-normal drop-shadow-[0_2px_8px_rgba(19,77,180,0.22)]">
            {title}
          </h1>
        </div>

        <div className="absolute right-[34px] top-[86px] z-20 h-[154px] w-[244px]">
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
    </header>
  )
}
