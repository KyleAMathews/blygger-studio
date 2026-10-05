import { createRoot } from 'react-dom/client';
import { SheetHost } from '../../../src/ui/sheets.tsx';
import { App } from '../../panel/App.tsx';
import '../../panel/panel.css';

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <SheetHost />
  </>,
);
