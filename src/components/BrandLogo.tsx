type BrandLogoProps = {
  compact?: boolean
  className?: string
}

export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  return (
    <span className={`alurin-brand${compact ? ' compact' : ''}${className ? ` ${className}` : ''}`}>
      <span className="alurin-brand-symbol" aria-hidden="true">
        <img src="/alurin-logo.png" alt="" />
      </span>
      {!compact ? <span className="alurin-brand-name">alurin<span>.</span></span> : null}
    </span>
  )
}
