type AppIconProps = {
  name: string
}

export function AppIcon({ name }: AppIconProps) {
  switch (name) {
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
        </svg>
      )
    case 'user':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" />
        </svg>
      )
    case 'layers':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Zm0 8 9 5-9 5-9-5 9-5Z" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 2 1.8 4.7L18.5 8l-4.7 1.3L12 14l-1.8-4.7L5.5 8l4.7-1.3L12 2Zm7 12 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM6 14l1.2 2.8L10 18l-2.8 1.2L6 22l-1.2-2.8L2 18l2.8-1.2L6 14Z" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm12 8H5v10h14V10Z" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5h-2v6l5 3 .9-1.8-3.9-2.2V7Z" />
        </svg>
      )
    case 'link':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.59 13.41a1.996 1.996 0 0 0 2.82 0l3.18-3.18a2 2 0 0 0-2.83-2.83l-1.06 1.06-1.41-1.41 1.06-1.06a4 4 0 0 1 5.66 5.66l-3.18 3.18a4 4 0 0 1-5.66 0l1.42-1.42Zm2.82-2.82-2.82 2.82-1.41-1.41 2.82-2.82 1.41 1.41Zm-8.49 2.82 3.18-3.18a4 4 0 1 1 5.66 5.66l-1.06 1.06-1.41-1.41 1.06-1.06a2 2 0 1 0-2.83-2.83L6.34 14.83a2 2 0 0 0 2.83 2.83l1.06-1.06 1.41 1.41-1.06 1.06a4 4 0 0 1-5.66-5.66Z" />
        </svg>
      )
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5h2v14h-2zM5 11h14v2H5z" />
        </svg>
      )
    case 'pencil':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25Zm14.71-9.04c.39-.39.39-1.02 0-1.41l-1.51-1.51a1 1 0 0 0-1.41 0l-1.18 1.18 2.75 2.75 1.35-1.01Z" />
        </svg>
      )
    case 'minus':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 11h14v2H5z" />
        </svg>
      )
    case 'trash':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM6 7h12l-1 14H7L6 7Z" />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9.55 17.47-4.5-4.5 1.41-1.41 3.09 3.08 7.99-7.99 1.41 1.42-9.4 9.4Z" />
        </svg>
      )
    case 'info':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-6h2Zm0-8h-2V7h2Z" />
        </svg>
      )
    case 'logout':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 17v-2h4v-6h-4V7l-5 5 5 5Zm8-13H12V6h6v12h-6v2h6a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
        </svg>
      )
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16v2H4V7Zm0 4h16v2H4v-2Zm0 4h16v2H4v-2Z" />
        </svg>
      )
    case 'close':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" />
        </svg>
      )
    case 'panel-left':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h16v16H4V4Zm2 2v12h4V6H6Zm6 0v12h6V6h-6Z" />
        </svg>
      )
    default:
      return null
  }
}
