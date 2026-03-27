import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
} from "@mui/material";

type AnalyticsTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

type AnalyticsTableRow = {
  key: string;
  cells: React.ReactNode[];
};

export default function AnalyticsTable({
  ariaLabel,
  columns,
  rows,
  footer,
}: {
  ariaLabel: string;
  columns: AnalyticsTableColumn[];
  rows: AnalyticsTableRow[];
  footer?: React.ReactNode[];
}) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: "divider",
        boxShadow: "none",
        bgcolor: "background.paper",
      }}
    >
      <Table size="small" aria-label={ariaLabel}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align ?? "left"}
                sx={tableHeaderCellSx}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} hover>
              {row.cells.map((cell, index) => (
                <TableCell
                  key={`${row.key}-${columns[index]?.key ?? index}`}
                  align={columns[index]?.align ?? "left"}
                  sx={tableBodyCellSx}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {footer ? (
          <TableFooter>
            <TableRow>
              {footer.map((cell, index) => (
                <TableCell
                  key={`footer-${columns[index]?.key ?? index}`}
                  align={columns[index]?.align ?? "left"}
                  sx={tableFooterCellSx}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </TableContainer>
  );
}

const tableHeaderCellSx = {
  fontSize: "0.6875rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
  borderBottomColor: "divider",
  whiteSpace: "nowrap",
} as const;

const tableBodyCellSx = {
  fontSize: "0.875rem",
  color: "text.primary",
  borderBottomColor: "rgba(221, 226, 232, 0.9)",
  whiteSpace: "nowrap",
} as const;

const tableFooterCellSx = {
  fontSize: "0.875rem",
  fontWeight: 700,
  color: "text.primary",
  borderTop: "1px solid",
  borderTopColor: "divider",
  whiteSpace: "nowrap",
} as const;
