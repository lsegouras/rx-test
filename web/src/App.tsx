/*
 * App.tsx | Layer: Web
 * Application shell: MUI baseline styles around the single page.
 * Must NOT fetch data or hold queue state.
 */
import { CssBaseline, Typography } from '@mui/material';

/** Root component. The app has one page, so there is no router. @see PDF §8 */
export default function App() {
  return (
    <>
      <CssBaseline />
      <Typography variant="h6" component="h1" sx={{ p: 2 }}>
        Kitchen Display
      </Typography>
    </>
  );
}
