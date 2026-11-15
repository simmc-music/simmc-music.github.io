import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import '../app/simmusic.css';
globalThis.SIMMUSIC_API_BASE = 'https://121.40.158.251:1145';
createRoot(document.getElementById('root')!).render(<Home/>);
