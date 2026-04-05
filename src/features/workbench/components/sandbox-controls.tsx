"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, MenuItem, Stack, TextField } from "@mui/material";

import { ActionButton, MetricRow, SectionBlock, SemanticBadge, Text } from "@/design-system";

import { applySandboxChanges, createSandboxSession } from "../api";
import { WorkbenchPolicyFeedback } from "../types";

export default function SandboxControls({
  portfolioId,
  sessionId,
  warnings,
}: {
  portfolioId: string;
  sessionId: string | null;
  warnings: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityId, setSecurityId] = useState("");
  const [transactionType, setTransactionType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(1);
  const [evaluatePolicy, setEvaluatePolicy] = useState(true);
  const [sessionVersion, setSessionVersion] = useState<number | null>(null);
  const [policyFeedback, setPolicyFeedback] = useState<WorkbenchPolicyFeedback | null>(null);

  async function onCreateSession() {
    setError(null);
    setLoading(true);
    try {
      const response = await createSandboxSession(portfolioId, {
        created_by: "advisor_1",
        ttl_hours: 24,
      });
      setSessionVersion(response.session_version);
      setPolicyFeedback(response.policy_feedback ?? null);
      router.push(`/workbench/${encodeURIComponent(portfolioId)}?sessionId=${encodeURIComponent(response.session_id)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  async function onApplyChange() {
    if (!sessionId) {
      setError("Create a sandbox session first.");
      return;
    }
    if (!securityId.trim()) {
      setError("Security ID is required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await applySandboxChanges(portfolioId, sessionId, {
        changes: [
          {
            security_id: securityId.trim(),
            transaction_type: transactionType,
            quantity,
          },
        ],
        evaluate_policy: evaluatePolicy,
      });
      setSessionVersion(response.session_version);
      setPolicyFeedback(response.policy_feedback);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply changes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionBlock title="Live Sandbox">
      <Text variant="secondary" className="muted">
        Session: {sessionId ?? "none"} | Version: {sessionVersion ?? "N/A"}
      </Text>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
        <ActionButton onClick={onCreateSession} disabled={loading}>
          {loading ? "Working..." : "Create Session"}
        </ActionButton>
      </Stack>
      <Box>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField
            label="Security ID"
            size="small"
            value={securityId}
            onChange={(event) => setSecurityId(event.target.value)}
          />
          <TextField
            label="Transaction"
            size="small"
            select
            value={transactionType}
            onChange={(event) => setTransactionType(event.target.value as "BUY" | "SELL")}
          >
            <MenuItem value="BUY">BUY</MenuItem>
            <MenuItem value="SELL">SELL</MenuItem>
          </TextField>
          <TextField
            label="Quantity"
            size="small"
            type="number"
            value={quantity}
            onChange={(event) => {
              const next = Number((event.target as HTMLInputElement).value);
              setQuantity(Number.isNaN(next) ? 0 : next);
            }}
          />
          <TextField
            label="Policy Eval"
            size="small"
            select
            value={evaluatePolicy ? "ON" : "OFF"}
            onChange={(event) => setEvaluatePolicy(event.target.value === "ON")}
          >
            <MenuItem value="ON">ON</MenuItem>
            <MenuItem value="OFF">OFF</MenuItem>
          </TextField>
          <ActionButton priority="primary" onClick={onApplyChange} disabled={loading || !sessionId}>
            {loading ? "Applying..." : "Apply Change"}
          </ActionButton>
        </Stack>
      </Box>
      {error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : null}

      <div className="constraint-rail" style={{ marginTop: 14 }}>
        <MetricRow
          label="Policy Gate"
          value={
            <SemanticBadge
              tone={
                policyFeedback?.status === "PASS"
                  ? "success"
                  : policyFeedback?.status === "UNAVAILABLE"
                    ? "warn"
                    : policyFeedback?.status
                      ? "danger"
                      : "default"
              }
            >
              {policyFeedback?.status ?? "NOT_EVALUATED"}
            </SemanticBadge>
          }
        />
        <MetricRow
          label="Workflow Readiness"
          value={
            <SemanticBadge tone={warnings.length ? "warn" : "success"}>
              {warnings.length ? "WARNINGS_PRESENT" : "READY"}
            </SemanticBadge>
          }
        />
        <MetricRow label="Policy Detail" value={policyFeedback?.detail ?? "Run simulation with policy evaluation enabled."} />
      </div>
    </SectionBlock>
  );
}
