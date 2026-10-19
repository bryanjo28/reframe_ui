
import { AppIcon } from './AppIcon'
import { paymentMethodLabel } from '../utils/paymentMethods'

type PaymentMethod = string | {
  code?: string
  id?: string
  method?: string
  name?: string
  label?: string
}

type PaymentMethodSelectorProps = {
  methods: PaymentMethod[]
  value: string
  onChange: (method: string) => void
  name?: string
}

export function PaymentMethodSelector({
  methods,
  value,
  onChange,
  name = 'payment-method',
}: PaymentMethodSelectorProps) {

  console.log('[PaymentMethodSelector] methods:', methods)
  console.log('[PaymentMethodSelector] first method:', methods?.[0])
  console.log('[PaymentMethodSelector] selected value:', value)
  return (
    <div
      className="payment-method-options"
      role="radiogroup"
      aria-label="Metode pembayaran"
    >
      {methods.map((item, index) => {
        // Mendukung data string maupun object.
        const method =
          typeof item === 'string'
            ? item
            : item.code ?? item.method ?? item.id ?? ''

        if (!method) {
          console.warn('Invalid payment method:', item)
          return null
        }

        const selected = method === value

        const label =
          typeof item === 'object' && (item.name || item.label)
            ? item.name || item.label!
            : paymentMethodLabel(method)

        return (
          <label
            className={`payment-method-option${selected ? ' selected' : ''}`}
            key={`${method}-${index}`}
          >
            <input
              type="radio"
              name={name}
              value={method}
              checked={selected}
              onChange={() => onChange(method)}
            />

            <span className="payment-method-option-icon">
              <AppIcon name={method === 'qris' ? 'sparkles' : 'lock'} />
            </span>

            <span>
              <strong>{label}</strong>
              <small>
                {method === 'qris'
                  ? 'Scan dari aplikasi bank atau e-wallet'
                  : 'Bayar melalui nomor virtual account'}
              </small>
            </span>

            <i className="payment-radio" aria-hidden="true" />
          </label>
        )
      })}
    </div>
  )
}
