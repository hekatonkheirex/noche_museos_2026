import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { enableOffline } from './offline.js'

createRoot(document.getElementById('root')).render(<App />)
enableOffline()
