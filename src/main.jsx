import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/design-tokens.css'
import './index.css'
import './styles/diamonds-skin.css'
import { registerServiceWorker } from './utils/pushNotification'

// Install the background worker as soon as the web app starts. This does not
// request notification permission; it only prepares Web Push support.
void registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
