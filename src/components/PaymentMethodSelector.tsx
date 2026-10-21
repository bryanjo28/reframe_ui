import { AppIcon } from './AppIcon'
import {
  isVirtualAccountMethod,
  paymentMethodCode,
  paymentMethodLabel,
  type PaymentMethodOption,
} from '../utils/paymentMethods'

type PaymentMethodSelectorProps = {
  methods: PaymentMethodOption[]
  value: string
  onChange: (method: string) => void
  name?: string
  language?: 'id' | 'en'
}

function methodName(method: PaymentMethodOption) {
  if (typeof method === 'object') return method.name || method.label || paymentMethodLabel(paymentMethodCode(method))
  return paymentMethodLabel(method)
}

export function PaymentMethodSelector({
  methods,
  value,
  onChange,
  name = 'payment-method',
  language = 'id',
}: PaymentMethodSelectorProps) {
  const availableMethods = methods
    .map((item) => ({ item, code: paymentMethodCode(item) }))
    .filter((method) => method.code)
  const qrisMethod = availableMethods.find(({ code }) => code.toLowerCase() === 'qris')
  const virtualAccounts = availableMethods.filter(({ item, code }) =>
    code.toLowerCase() !== 'qris' && isVirtualAccountMethod(item),
  )
  const otherMethods = availableMethods.filter(({ item, code }) =>
    code.toLowerCase() !== 'qris' && !isVirtualAccountMethod(item),
  )
  const normalizedValue = value.trim().toLowerCase()
  const selectedVirtualAccount = virtualAccounts.find(({ code }) => code.toLowerCase() === normalizedValue)
  const selectedOtherMethod = otherMethods.find(({ code }) => code.toLowerCase() === normalizedValue)
  const hasQrisSelected = Boolean(qrisMethod && normalizedValue === qrisMethod.code.toLowerCase())
  const hasVirtualAccountSelected = Boolean(selectedVirtualAccount)
  const hasOtherMethodSelected = Boolean(selectedOtherMethod)
  const copy = language === 'en'
    ? {
        label: 'Payment method',
        qris: 'QRIS',
        qrisDescription: 'Scan with a banking or e-wallet app',
        va: 'Virtual Account',
        vaDescription: 'Pay using a bank virtual account',
        chooseBank: 'Choose a bank',
        other: 'Other available methods',
        otherDescription: 'Choose one of the available payment methods',
        empty: 'No payment methods are currently available.',
      }
    : {
        label: 'Metode pembayaran',
        qris: 'QRIS',
        qrisDescription: 'Scan dari aplikasi bank atau e-wallet',
        va: 'Virtual Account',
        vaDescription: 'Bayar melalui virtual account bank',
        chooseBank: 'Pilih bank',
        other: 'Metode lain yang tersedia',
        otherDescription: 'Pilih salah satu metode pembayaran yang tersedia',
        empty: 'Belum ada metode pembayaran yang tersedia.',
      }

  if (!availableMethods.length) {
    return <p className="payment-method-empty">{copy.empty}</p>
  }

  return (
    <div className="payment-method-picker">
      <div className="payment-method-options" role="radiogroup" aria-label={copy.label}>
        {qrisMethod ? (
          <button
            className={`payment-method-category${hasQrisSelected ? ' selected' : ''}`}
            type="button"
            role="radio"
            aria-label={copy.qris}
            aria-checked={hasQrisSelected}
            onClick={() => onChange(qrisMethod.code)}
          >
            <span className="payment-method-option-icon"><AppIcon name="sparkles" /></span>
            <span className="payment-method-category-copy">
              <strong>{copy.qris}</strong>
              <small>{copy.qrisDescription}</small>
            </span>
            <span className="payment-method-selection" aria-hidden="true" />
          </button>
        ) : null}

        {virtualAccounts.length ? (
          <button
            className={`payment-method-category${hasVirtualAccountSelected ? ' selected' : ''}`}
            type="button"
            role="radio"
            aria-label={copy.va}
            aria-checked={hasVirtualAccountSelected}
            onClick={() => {
              if (!hasVirtualAccountSelected) onChange(virtualAccounts[0].code)
            }}
          >
            <span className="payment-method-option-icon"><AppIcon name="lock" /></span>
            <span className="payment-method-category-copy">
              <strong>{copy.va}</strong>
              <small>{copy.vaDescription}</small>
            </span>
            <span className="payment-method-selection" aria-hidden="true" />
          </button>
        ) : null}

        {otherMethods.length ? (
          <button
            className={`payment-method-category${hasOtherMethodSelected ? ' selected' : ''}`}
            type="button"
            role="radio"
            aria-label={copy.other}
            aria-checked={hasOtherMethodSelected}
            onClick={() => {
              if (!hasOtherMethodSelected) onChange(otherMethods[0].code)
            }}
          >
            <span className="payment-method-option-icon"><AppIcon name="layers" /></span>
            <span className="payment-method-category-copy">
              <strong>{copy.other}</strong>
              <small>{copy.otherDescription}</small>
            </span>
            <span className="payment-method-selection" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {hasVirtualAccountSelected ? (
        <fieldset className="payment-bank-list">
          <legend>{copy.chooseBank}</legend>
          <div role="radiogroup" aria-label={copy.chooseBank}>
            {virtualAccounts.map(({ item, code }) => {
              const selected = normalizedValue === code.toLowerCase()
              return (
                <label className={`payment-bank-option${selected ? ' selected' : ''}`} key={code}>
                  <input
                    type="radio"
                    name={`${name}-bank`}
                    value={code}
                    aria-label={methodName(item)}
                    checked={selected}
                    onChange={() => onChange(code)}
                  />
                  <span className="payment-bank-mark" aria-hidden="true"><AppIcon name="lock" /></span>
                  <span className="payment-bank-name">{methodName(item)}</span>
                  <span className="payment-method-selection" aria-hidden="true" />
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      {hasOtherMethodSelected ? (
        <div className="payment-bank-list payment-other-list" role="radiogroup" aria-label={copy.other}>
          {otherMethods.map(({ item, code }) => {
            const selected = normalizedValue === code.toLowerCase()
            return (
              <label className={`payment-bank-option${selected ? ' selected' : ''}`} key={code}>
                <input
                  type="radio"
                  name={`${name}-other`}
                  value={code}
                  aria-label={methodName(item)}
                  checked={selected}
                  onChange={() => onChange(code)}
                />
                <span className="payment-bank-mark" aria-hidden="true"><AppIcon name="layers" /></span>
                <span className="payment-bank-name">{methodName(item)}</span>
                <span className="payment-method-selection" aria-hidden="true" />
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
