"use client";

import { useEffect, useState, type FormEvent } from "react";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import useMediaQuery from "@mui/material/useMediaQuery";

import { ActionButton } from "@/design-system";

import { formatDate } from "../formatters";
import styles from "./performance-custom-window-dialog.module.css";

export type PerformanceCustomWindow = {
  fromDate: string;
  toDate: string;
};

type PerformanceCustomWindowErrors = Partial<Record<keyof PerformanceCustomWindow, string>>;

export default function PerformanceCustomWindowDialog({
  open,
  confirmedWindow,
  earliestAvailableDate,
  latestAvailableDate,
  isSubmitting,
  onCancel,
  onApply,
  onExited,
}: {
  open: boolean;
  confirmedWindow: PerformanceCustomWindow;
  earliestAvailableDate?: string;
  latestAvailableDate?: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onApply: (window: PerformanceCustomWindow) => void;
  onExited: () => void;
}) {
  const fullScreen = useMediaQuery("(max-width: 640px)");
  const [draft, setDraft] = useState(confirmedWindow);
  const [errors, setErrors] = useState<PerformanceCustomWindowErrors>({});

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraft(confirmedWindow);
    setErrors({});
  }, [confirmedWindow, open]);

  function submitWindow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCustomWindow(
      draft,
      earliestAvailableDate,
      latestAvailableDate,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onApply(draft);
  }

  function cancelWindow() {
    if (isSubmitting) {
      return;
    }
    setDraft(confirmedWindow);
    setErrors({});
    onCancel();
  }

  const availableWindow = buildAvailableWindowLabel(
    earliestAvailableDate,
    latestAvailableDate,
  );

  return (
    <Dialog
      open={open}
      onClose={cancelWindow}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="xs"
      aria-labelledby="performance-custom-window-title"
      aria-describedby="performance-custom-window-guidance"
      data-performance-custom-window-dialog="true"
      slotProps={{
        paper: {
          className: styles.paper,
        },
        transition: {
          onExited,
        },
      }}
    >
      <form onSubmit={submitWindow} noValidate>
        <DialogTitle id="performance-custom-window-title" className={styles.title}>
          Choose a custom review window
        </DialogTitle>
        <DialogContent className={styles.content}>
          <DialogContentText
            id="performance-custom-window-guidance"
            className={styles.guidance}
          >
            {availableWindow}
          </DialogContentText>
          <div className={styles.dateGrid}>
            <TextField
              autoFocus
              required
              fullWidth
              size="small"
              type="date"
              label="From"
              value={draft.fromDate}
              error={Boolean(errors.fromDate)}
              helperText={errors.fromDate}
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  min: earliestAvailableDate,
                  max: draft.toDate || latestAvailableDate,
                },
              }}
              onChange={(event) => {
                setDraft((current) => ({ ...current, fromDate: event.currentTarget.value }));
                setErrors((current) => ({ ...current, fromDate: undefined, toDate: undefined }));
              }}
            />
            <TextField
              required
              fullWidth
              size="small"
              type="date"
              label="To"
              value={draft.toDate}
              error={Boolean(errors.toDate)}
              helperText={errors.toDate}
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  min: draft.fromDate || earliestAvailableDate,
                  max: latestAvailableDate,
                },
              }}
              onChange={(event) => {
                setDraft((current) => ({ ...current, toDate: event.currentTarget.value }));
                setErrors((current) => ({ ...current, fromDate: undefined, toDate: undefined }));
              }}
            />
          </div>
        </DialogContent>
        <DialogActions className={styles.actions}>
          <ActionButton type="button" priority="quiet" onClick={cancelWindow} disabled={isSubmitting}>
            Cancel
          </ActionButton>
          <ActionButton type="submit" priority="primary" disabled={isSubmitting}>
            {isSubmitting ? "Applying…" : "Apply window"}
          </ActionButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function validateCustomWindow(
  window: PerformanceCustomWindow,
  earliestAvailableDate?: string,
  latestAvailableDate?: string,
): PerformanceCustomWindowErrors {
  const errors: PerformanceCustomWindowErrors = {};
  if (!window.fromDate) {
    errors.fromDate = "Enter the first day of the review window.";
  }
  if (!window.toDate) {
    errors.toDate = "Enter the last day of the review window.";
  }
  if (window.fromDate && earliestAvailableDate && window.fromDate < earliestAvailableDate) {
    errors.fromDate = `Performance history begins ${formatDate(earliestAvailableDate)}.`;
  }
  if (window.toDate && latestAvailableDate && window.toDate > latestAvailableDate) {
    errors.toDate = `Performance history is available through ${formatDate(latestAvailableDate)}.`;
  }
  if (window.fromDate && window.toDate && window.fromDate > window.toDate) {
    errors.fromDate = "The first day must be on or before the last day.";
    errors.toDate = "The last day must be on or after the first day.";
  }
  return errors;
}

function buildAvailableWindowLabel(earliestAvailableDate?: string, latestAvailableDate?: string) {
  if (earliestAvailableDate && latestAvailableDate) {
    return `Available performance history: ${formatDate(earliestAvailableDate)} – ${formatDate(latestAvailableDate)}.`;
  }
  if (earliestAvailableDate) {
    return `Available performance history begins ${formatDate(earliestAvailableDate)}.`;
  }
  if (latestAvailableDate) {
    return `Available performance history is published through ${formatDate(latestAvailableDate)}.`;
  }
  return "Choose the exact period for this performance review.";
}
