type BrandLogoProps = {
  compact?: boolean;
  framed?: boolean;
  photo?: boolean;
};

export function BrandLogo({ compact = false, framed = false, photo = false }: BrandLogoProps) {
  const mark = (
    <div className={`${compact ? "brand brand-sm" : "brand"}${photo ? " brand-photo-wrap" : ""}`}>
      <img className="brand-logo-image" src="/brand/logo-horizontal.png" alt="SilverCare" />
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
