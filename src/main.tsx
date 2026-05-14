import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { FeedbackProvider } from './context/FeedbackContext'
import { ShopProvider } from './context/ShopContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FeedbackProvider>
          <ShopProvider>
            <App />
          </ShopProvider>
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
