import { AppIcon } from './AppIcon'

export type CheckoutOrderRow = {
  label: string
  value: string
  originalValue?: string
  variant?: 'discount'
}

type CheckoutOrderSummaryProps = {
  title?: string
  name: string
  description: string
  rows: CheckoutOrderRow[]
  totalLabel?: string
  total: string
  totalOriginal?: string
  note?: string
}

export function CheckoutOrderSummary({
  title = 'Ringkasan order',
  name,
  description,
  rows,
  totalLabel = 'Total pembayaran',
  total,
  totalOriginal,
  note,
}: CheckoutOrderSummaryProps) {
  return (
    <section className="checkout-order-summary" aria-label={title}>
      <div className="checkout-order-heading">
        <div>
          <p className="eyebrow">{title}</p>
          <div className="checkout-order-product">
            <span aria-hidden="true"><AppIcon name="sparkles" /></span>
            <div>
              <strong>{name}</strong>
              <small>{description}</small>
            </div>
          </div>
        </div>
      </div>
      <dl className="checkout-order-details">
        {rows.map((row) => (
          <div key={row.label} className={row.variant === 'discount' ? 'checkout-order-discount' : undefined}>
            <dt>{row.label}</dt>
            <dd className={row.originalValue ? 'checkout-order-price' : undefined}>
              {row.originalValue ? <del>{row.originalValue}</del> : null}
              <span>{row.value}</span>
            </dd>
          </div>
        ))}
        <div className="checkout-order-total">
          <dt>{totalLabel}</dt>
          <dd className={totalOriginal ? 'checkout-order-price' : undefined}>
            {totalOriginal ? <del>{totalOriginal}</del> : null}
            <span>{total}</span>
          </dd>
        </div>
      </dl>
      {note ? <p className="checkout-order-note">{note}</p> : null}
    </section>
  )
}
