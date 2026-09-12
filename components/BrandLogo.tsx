type BrandLogoProps = {
  compact?: boolean;
  framed?: boolean;
  photo?: boolean;
};

export function BrandLogo({ compact = false, framed = false, photo = false }: BrandLogoProps) {
  if (photo) {
    return (
      <div className="brand-photo-wrap">
        <img className="brand-photo" src="/logo.png" alt="SilverCare" />
      </div>
    );
  }

  const mark = (
    <div className={compact ? "brand brand-sm" : "brand"}>
      <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M32 54C14 40 10 26 20 17c6-5 12-2 12 6 0-8 6-11 12-6 10 9 6 23-12 37z"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path d="M36.5 24c8 2 13 10 12 18-7-1.5-14-8-12-18z" fill="currentColor" />
        <path
          d="M41 32c-1.2 2.4-3.4 5.2-6.2 7"
          fill="none"
          stroke="#faf7f2"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <div className="brand-text">
        <span className="brand-name">SilverCare</span>
        {compact ? null : <span className="brand-slogan">오늘도, 더 건강한 내일을 위해</span>}
      </div>
    </div>
  );

  if (!framed) {
    return mark;
  }

  return (
    <div className="brand-lockup">
      <span className="brand-rule" aria-hidden="true" />
      {mark}
      <span className="brand-rule" aria-hidden="true" />
    </div>
  );
}
