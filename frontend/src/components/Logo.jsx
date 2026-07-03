export default function Logo({ size = 36, className = '', showText = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/managex_logo.png"
        alt="ManageX"
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight">ManageX</span>
      )}
    </div>
  );
}
