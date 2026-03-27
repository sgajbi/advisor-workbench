import { Box, Typography } from "@mui/material";

type AnalyticsRankedRow = {
  key: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value: React.ReactNode;
  magnitudePct: number;
  tone: "positive" | "negative";
};

export default function AnalyticsRankedList({
  title,
  label,
  rows,
  scale,
}: {
  title: string;
  label: string;
  rows: AnalyticsRankedRow[];
  scale: number;
}) {
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 1,
        }}
      >
        <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "text.primary" }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "text.secondary" }}>
          {label}
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gap: 1 }}>
        {rows.map((row) => (
          <Box
            key={row.key}
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.15fr) minmax(120px, 1fr) 80px",
              gap: 1,
              alignItems: "center",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "text.primary" }}>
                {row.title}
              </Typography>
              {row.subtitle ? (
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                  {row.subtitle}
                </Typography>
              ) : null}
            </Box>

            <Box
              sx={{
                position: "relative",
                height: 10,
                borderRadius: 999,
                overflow: "hidden",
                backgroundColor: "rgba(31, 39, 51, 0.08)",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: `${(Math.abs(row.magnitudePct) / scale) * 100}%`,
                  borderRadius: 999,
                  background:
                    row.tone === "positive"
                      ? "linear-gradient(90deg, #5e8165 0%, #7f9a82 100%)"
                      : "linear-gradient(90deg, #8e625f 0%, #b1827e 100%)",
                }}
              />
            </Box>

            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 700,
                textAlign: "right",
                color: "text.primary",
              }}
            >
              {row.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
