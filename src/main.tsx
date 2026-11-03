import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// the standards app's styles load after the site's base styles so they win ties
import './standards/standards.css'
import './standards/ui.css'   // shared design system, last so its tokens win (2026-11-02)

createRoot(document.getElementById("root")!).render(<App />);
