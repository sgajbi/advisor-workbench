import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

type AnalyticsTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

type AnalyticsTableRow = {
  key: string;
  cells: React.ReactNode[];
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
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
        overflow: "auto",
      }}
    >
      <Table
        size="small"
        aria-label={ariaLabel}
        sx={{
          "& td, & th": {
            fontVariantNumeric: "tabular-nums",
          },
          "& tbody tr:nth-of-type(even)": {
            bgcolor: "rgba(15, 23, 42, 0.02)",
          },
          "& tbody tr:last-of-type td": {
            borderBottom: "none",
          },
        }}
      >
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
            <TableRow
              key={row.key}
              hover
              className={row.className}
              onClick={row.onClick}
              onMouseEnter={row.onMouseEnter}
              onMouseLeave={row.onMouseLeave}
              tabIndex={row.onClick ? 0 : undefined}
              aria-label={row.ariaLabel}
              onKeyDown={
                row.onClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        row.onClick?.();
                      }
                    }
                  : undefined
              }
              sx={
                row.onClick
                  ? {
                      cursor: "pointer",
                      "&:focus-visible": {
                        outline: "2px solid",
                        outlineColor: "rgba(49, 93, 138, 0.7)",
                        outlineOffset: "-2px",
                      },
                    }
                  : undefined
              }
            >
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
  position: "sticky",
  top: 0,
  zIndex: 1,
  py: 1.25,
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
  bgcolor: "rgba(247, 249, 251, 0.98)",
  borderBottomColor: "divider",
  whiteSpace: "nowrap",
} as const;

const tableBodyCellSx = {
  fontSize: "0.875rem",
  py: 1.1,
  color: "text.primary",
  borderBottomColor: "rgba(221, 226, 232, 0.65)",
  whiteSpace: "nowrap",
} as const;

const tableFooterCellSx = {
  fontSize: "0.875rem",
  fontWeight: 700,
  py: 1.15,
  color: "text.primary",
  borderTop: "1px solid",
  borderTopColor: "divider",
  bgcolor: "rgba(247, 249, 251, 0.98)",
  whiteSpace: "nowrap",
} as const;
