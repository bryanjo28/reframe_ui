const modalSelector = '[role="dialog"], [role="alertdialog"]'
const backdropSelector = '.content-bank-dialog-backdrop,.schedule-dialog-backdrop,.content-output-modal-backdrop,.threads-disconnect-modal-backdrop,.topic-picker-backdrop,.mobile-more-backdrop,.onboarding-overlay,.auth-overlay'

export function dismissModal(onDismiss: () => void, source?: Element | null) {
  const sourceElement = source || null
  const backdrop = sourceElement?.closest(backdropSelector) || sourceElement?.parentElement?.closest(backdropSelector)
  const dialog = sourceElement?.closest(modalSelector) || backdrop?.querySelector(modalSelector) || Array.from(document.querySelectorAll(modalSelector)).at(-1)

  if (!dialog || dialog.classList.contains('modal-closing')) {
    if (!dialog) onDismiss()
    return
  }

  dialog.classList.add('modal-closing')
  backdrop?.classList.add('modal-backdrop-closing')

  let completed = false
  const finish = () => {
    if (completed) return
    completed = true
    onDismiss()
  }

  dialog.addEventListener('animationend', finish, { once: true })
  window.setTimeout(finish, 280)
}
