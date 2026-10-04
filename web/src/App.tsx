/*
 * App.tsx | Layer: Web
 * Application shell: MUI baseline styles around the single page.
 * Must NOT fetch data or hold queue state.
 */
import { CssBaseline } from '@mui/material';
import KitchenDisplay from './pages/KitchenDisplay';

/** Root component. The app has one page, so there is no router. @see PDF §8 */
export default function App() {
  return (
    <>
      <CssBaseline />
      <KitchenDisplay />
    </>
  );
}
