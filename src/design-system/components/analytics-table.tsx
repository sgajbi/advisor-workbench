import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { lotusThemeTokens } from "../theme/tokens";
import { cx } from "../utils/cx";

export type AnalyticsTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type AnalyticsTableRow = {
  key: string;
  cells: React.ReactNode[];
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export type AnalyticsTableDensity = "compact" | "comfortable";
export type AnalyticsTableVariant = "default" | "analysis" | "observation" | "portfolio";

type AnalyticsTableState = {
  title: string;
  body: string;
};

const densityPaddingY = {
  compact: lotusThemeTokens.table.cellPadding.y,
  comfortable: "14px",
} as const;

const densityFontSize = {
  compact: lotusThemeTokens.typography.size.textSm,
  comfortable: "0.9375rem",
} as const;

const headerFontSize = {
  compact: lotusThemeTokens.typography.size.text2xs,
  comfortable: lotusThemeTokens.typography.size.textXs,
} as const;

const footerFontSize = {
  compact: "0.8125rem",
  comfortable: lotusThemeTokens.typography.size.textSm,
} as const;

export default function AnalyticsTable({
  ariaLabel,
  columns,
  rows,
  footer,
  className,
  dense,
  density = dense ? "compact" : "comfortable",
  variant = "default",
  emptyState,
  loadingState,
}: {
  ariaLabel: string;
  columns: AnalyticsTableColumn[];
  rows: AnalyticsTableRow[];
  footer?: React.ReactNode[];
  className?: string;
  dense?: boolean;
  density?: AnalyticsTableDensity;
  variant?: AnalyticsTableVariant;
  emptyState?: AnalyticsTableState;
  loadingState?: AnalyticsTableState;
}) {
  const hasRows = rows.length > 0;
  const state = !hasRows ? loadingState ?? emptyState ?? null : null;
  const headerCellSx = getHeaderCellSx(density);
  const bodyCellSx = getBodyCellSx(density);
  const footerCellSx = getFooterCellSx(density);

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      className={cx(
        "analytics-table-frame",
        `analytics-table-density-${density}`,
        `analytics-table-variant-${variant}`,
        density === "compact" && "analytics-table-frame-dense",
        className
      )}
      sx={{
        borderRadius: `${lotusThemeTokens.radius.md}px`,
        borderColor: lotusThemeTokens.color.border.default,
        boxShadow: "none",
        bgcolor: lotusThemeTokens.color.surface.panel,
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
                className={cx(
                  "analytics-table-cell",
                  "analytics-table-head-cell",
                  column.align === "right" && "analytics-table-cell-numeric"
                )}
                sx={headerCellSx}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {state ? (
            <TableRow className="analytics-table-state-row">
              <TableCell colSpan={Math.max(columns.length, 1)} className="analytics-table-state-cell">
                <div className="analytics-table-state">
                  <strong className="analytics-table-state-title">{state.title}</strong>
                  <span className="analytics-table-state-body">{state.body}</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.key}
                hover
                className={cx("analytics-table-row", row.className)}
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
                {row.cells.map((cell, index) => {
                  const column = columns[index];
                  return (
                    <TableCell
                      key={`${row.key}-${column?.key ?? index}`}
                      align={column?.align ?? "left"}
                      className={cx(
                        "analytics-table-cell",
                        "analytics-table-body-cell",
                        column?.align === "right" && "analytics-table-cell-numeric"
                      )}
                      sx={bodyCellSx}
                    >
                      {cell}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
        {footer && hasRows ? (
          <TableFooter>
            <TableRow>
              {footer.map((cell, index) => {
                const column = columns[index];
                return (
                  <TableCell
                    key={`footer-${column?.key ?? index}`}
                    align={column?.align ?? "left"}
                    className={cx(
                      "analytics-table-cell",
                      "analytics-table-footer-cell",
                      column?.align === "right" && "analytics-table-cell-numeric"
                    )}
                    sx={footerCellSx}
                  >
                    {cell}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </TableContainer>
  );
}

function getHeaderCellSx(density: AnalyticsTableDensity) {
  return {
    position: "sticky",
    top: 0,
    zIndex: 1,
    py: densityPaddingY[density],
    px: lotusThemeTokens.table.cellPadding.x,
    fontSize: headerFontSize[density],
    fontWeight: 800,
    letterSpacing: lotusThemeTokens.typography.tracking.label,
    textTransform: "uppercase",
    color: lotusThemeTokens.color.text.muted,
    bgcolor: "rgba(247, 249, 251, 0.98)",
    borderBottomColor: lotusThemeTokens.color.border.default,
    whiteSpace: "nowrap",
  } as const;
}

function getBodyCellSx(density: AnalyticsTableDensity) {
  return {
    fontSize: densityFontSize[density],
    py: densityPaddingY[density],
    px: lotusThemeTokens.table.cellPadding.x,
    color: lotusThemeTokens.color.text.primary,
    borderBottomColor: "rgba(221, 226, 232, 0.65)",
    whiteSpace: "nowrap",
  } as const;
}

function getFooterCellSx(density: AnalyticsTableDensity) {
  return {
    fontSize: footerFontSize[density],
    fontWeight: 800,
    py: densityPaddingY[density],
    px: lotusThemeTokens.table.cellPadding.x,
    color: lotusThemeTokens.color.text.primary,
    borderTop: "1px solid",
    borderTopColor: lotusThemeTokens.color.border.default,
    bgcolor: "rgba(247, 249, 251, 0.98)",
    whiteSpace: "nowrap",
  } as const;
}
