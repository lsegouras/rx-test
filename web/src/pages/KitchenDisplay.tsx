/*
 * KitchenDisplay.tsx | Layer: Web
 * The single page: title, status filter, API error alert and the queue table.
 * Must NOT hold business rules; it shows what the API returned and forwards clicks to useQueue.
 */
import {
  Alert,
  Container,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { QueueFilter } from '../api/types';
import QueueTable from '../components/QueueTable';
import { useQueue } from '../hooks/useQueue';

const FILTERS: { value: QueueFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'received', label: 'Received' },
  { value: 'preparing', label: 'Preparing' },
];

/**
 * Kitchen Display page for the expeditor.
 * @see PDF §8
 */
export default function KitchenDisplay() {
  const { items, filter, setFilter, loading, error, clearError, pendingId, runAction } = useQueue();
  const firstLoad = loading && items.length === 0;

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" component="h1">
          Kitchen Display
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          aria-label="Queue filter"
          // MUI sends null when the selected button is clicked again; keep the current filter.
          onChange={(_event, value: QueueFilter | null) => value !== null && setFilter(value)}
        >
          {FILTERS.map(({ value, label }) => (
            <ToggleButton key={value} value={value}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 1 }}>
          {error.code && <strong>{error.code}: </strong>}
          {error.message}
        </Alert>
      )}

      {firstLoad ? (
        <LinearProgress />
      ) : (
        <QueueTable items={items} pendingId={pendingId} onAction={runAction} />
      )}
    </Container>
  );
}
