import './sentry'
import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import OverlayScrollbars from './components/layout/OverlayScrollbars.jsx'
import './styles/design-tokens.css'
import './styles/diamonds-kit.css'
import './index.css'
import './styles/diamonds-skin.css'
import './styles/scrollbars.css'
import { registerServiceWorker } from './utils/pushNotification'

// Install the background worker as soon as the web app starts. This does not
// request notification permission; it only prepares Web Push support.
void registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={
      <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Ứng dụng gặp lỗi. Vui lòng tải lại trang để tiếp tục.</p>
        <button onClick={() => window.location.reload()}>Tải lại trang</button>
      </div>
    }>
      <App />
      <OverlayScrollbars />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
