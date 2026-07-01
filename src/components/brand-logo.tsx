// App logo — the real artwork (cropped from the source image), served from
// /public/logo.png so it renders pixel-exact everywhere.
export function BrandLogo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Smart Slip Analyzer"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
