import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// the standards app's styles load after the site's base styles so they win ties
import './standards/standards.css'

createRoot(document.getElementById("root")!).render(<App />);
