export default function QuestionHeader({ title, backgroundImageUrl, bookImageUrl }) {
  return (
    <header className="pql-question-header relative z-10 h-[360px] overflow-hidden">
      <div
        className="pql-question-header__background absolute inset-0"
        style={{ backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined }}
      />
      <div className="pql-question-header__content absolute inset-0 z-20 flex items-center justify-center px-[72px] text-center">
        <h1 className="text-[40px] leading-[1.35] font-extrabold text-white drop-shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
          {title}
        </h1>
      </div>
      {bookImageUrl ? (
        <img
          className="absolute right-[28px] bottom-[18px] z-30 h-[132px] w-[176px] object-contain"
          src={bookImageUrl}
          alt=""
          aria-hidden="true"
        />
      ) : null}
    </header>
  )
}
