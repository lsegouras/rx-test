/*
 * QueueTable.tsx | Layer: Web
 * The queue as a dense table: one row per item, in the order of the array it receives.
 * Must NOT sort, score, or derive buttons from status: it renders one button per allowed_actions entry.
 */
import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { QueueItem } from '../api/types';
import {
  actionColor,
  actionLabel,
  formatItems,
  formatPromised,
  formatWait,
  statusColor,
  statusLabel,
  typeLabel,
} from '../format';

const COLUMNS = ['Score', 'Customer', 'Type', 'Items', 'Wait', 'Promised', 'VIP', 'Status', 'Actions'];

interface QueueTableProps {
  /** Queue items exactly as the API returned them. */
  items: QueueItem[];
  /** Id of the order whose action is in flight; its buttons are disabled. */
  pendingId: number | null;
  onAction: (id: number, action: string) => void;
}

/**
 * Renders the queue, or the empty state when there are no items.
 * @see PDF §8
 */
export default function QueueTable({ items, pendingId, onAction }: QueueTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" aria-label="Kitchen queue">
        <TableHead>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableCell key={column}>{column}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No orders in the queue
              </TableCell>
            </TableRow>
          )}
          {items.map((item) => (
            <TableRow key={item.id} data-order-id={item.id} hover>
              <TableCell sx={{ fontWeight: 700 }}>{item.score}</TableCell>
              <TableCell>{item.customer_name}</TableCell>
              <TableCell>{typeLabel(item.type)}</TableCell>
              <TableCell>{formatItems(item.items)}</TableCell>
              <TableCell>{formatWait(item.minutes_waiting)}</TableCell>
              <TableCell>{formatPromised(item.promised_at)}</TableCell>
              <TableCell>{item.is_vip && <Chip label="VIP" size="small" color="warning" />}</TableCell>
              <TableCell>
                <Chip
                  label={statusLabel(item.status)}
                  size="small"
                  variant="outlined"
                  color={statusColor(item.status)}
                />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  {item.allowed_actions.map((action) => (
                    <Button
                      key={action}
                      size="small"
                      variant="outlined"
                      color={actionColor(action)}
                      disabled={pendingId === item.id}
                      onClick={() => onAction(item.id, action)}
                    >
                      {actionLabel(action)}
                    </Button>
                  ))}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
