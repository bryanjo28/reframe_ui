import { AppIcon } from './AppIcon'
import { paymentMethodLabel } from '../utils/paymentMethods'

export function PaymentMethodSelector({ methods, value, onChange, name = 'payment-method' }: { methods: string[]; value: string; onChange: (method: string) => void; name?: string }) {
  return <div className="payment-method-options" role="radiogroup" aria-label="Metode pembayaran">
    {methods.map((method) => {
      const selected = method === value
      return <label className={`payment-method-option${selected ? ' selected' : ''}`} key={method}>
        <input type="radio" name={name} value={method} checked={selected} onChange={() => onChange(method)} />
        <span className="payment-method-option-icon"><AppIcon name={method === 'qris' ? 'sparkles' : 'lock'} /></span>
        <span><strong>{paymentMethodLabel(method)}</strong><small>{method === 'qris' ? 'Scan dari aplikasi bank atau e-wallet' : 'Bayar melalui nomor virtual account'}</small></span>
        <i className="payment-radio" aria-hidden="true" />
      </label>
    })}
  </div>
}
