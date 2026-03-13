import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import './index.css'

function Root() {
  const [ready, setReady] = useState(false)
  return (
    <>
      {!ready && <SplashScreen onDone={() => setReady(true)} />}
      <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        <App />
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
