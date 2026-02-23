import { Alert, AlertTitle } from "@mui/material";

type PartialFailure = {
  source_service: string;
  error_code: string;
  detail: string;
};

type Props = {
  items: PartialFailure[];
};

export default function PartialFailureBanner(props: Props) {
  if (!props.items.length) {
    return null;
  }

  return (
    <Alert severity="warning" aria-label="partial-failures" sx={{ mb: 1.2 }}>
      <AlertTitle>Partial Data Warning</AlertTitle>
      <ul>
        {props.items.map((item) => (
          <li key={`${item.source_service}:${item.error_code}`}>
            {item.source_service}: {item.error_code}
          </li>
        ))}
      </ul>
    </Alert>
  );
}
