import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { capturarUtms } from './lib/utm'

capturarUtms();

createRoot(document.getElementById("root")!).render(<App />);
