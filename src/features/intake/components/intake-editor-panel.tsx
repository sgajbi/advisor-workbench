import { Alert } from "@mui/material";

import { ActionButton, SectionBlock, SemanticBadge } from "@/design-system";

import {
  INTAKE_TASKS,
  type CreatePortfolioDraft,
  type IntakeDraft,
  type IntakeValidationIssue,
} from "../draft";
import styles from "../intake-workspace.module.css";
import { fieldId, InputField, IntakeRowsEditor, LookupField } from "./intake-row-editors";

export function IntakeEditorPanel({
  draft,
  validationAttempted,
  validationIssues,
  referenceDataState,
  portfolioOptions,
  instrumentOptions,
  currencyOptions,
  fileParseState,
  fileParseError,
  onChangeTask,
  onLoadReferenceData,
  onUpdate,
  onParseFile,
}: {
  draft: IntakeDraft;
  validationAttempted: boolean;
  validationIssues: IntakeValidationIssue[];
  referenceDataState: "manual" | "loading" | "available" | "unavailable";
  portfolioOptions: string[];
  instrumentOptions: string[];
  currencyOptions: string[];
  fileParseState: "idle" | "parsing" | "ready" | "error";
  fileParseError: string | null;
  onChangeTask: () => void;
  onLoadReferenceData: () => void;
  onUpdate: (updater: (current: IntakeDraft) => IntakeDraft) => void;
  onParseFile: (file: File) => void;
}) {
  const task = INTAKE_TASKS.find((item) => item.task === draft.task);
  const visibleIssues = validationAttempted ? validationIssues : [];
  const issueByField = new Map(visibleIssues.map((issue) => [issue.field, issue.message]));

  return (
    <SectionBlock
      title={task?.title ?? "Intake request"}
      subtitle={task?.description}
      actions={
        <div className={styles.editorHeaderActions}>
          <SemanticBadge>{draft.task === "IMPORT_FILE" ? "File review" : "Manual entry"}</SemanticBadge>
          <ActionButton priority="quiet" onClick={onChangeTask}>
            Change request type
          </ActionButton>
        </div>
      }
    >
      <div className={styles.editorStack}>
        {draft.task !== "IMPORT_FILE" ? (
          <ReferenceDataSupport state={referenceDataState} onLoad={onLoadReferenceData} />
        ) : null}

        {visibleIssues.length > 0 ? <ValidationSummary issues={visibleIssues} /> : null}

        {draft.task === "CREATE_PORTFOLIO" ? (
          <PortfolioProfileEditor
            draft={draft}
            portfolioOptions={portfolioOptions}
            currencyOptions={currencyOptions}
            issueFor={(field) => issueByField.get(field)}
            onUpdate={onUpdate}
          />
        ) : null}

        {draft.task === "ADD_POSITIONS" || draft.task === "ADD_TRANSACTIONS" ? (
          <>
            <div className={styles.contextGrid}>
              <LookupField
                id={fieldId("portfolioId")}
                label="Target portfolio code"
                value={draft.portfolioId}
                options={portfolioOptions}
                error={issueByField.get("portfolioId")}
                onChange={(value) =>
                  onUpdate((current) =>
                    current.task === "ADD_POSITIONS" || current.task === "ADD_TRANSACTIONS"
                      ? { ...current, portfolioId: value }
                      : current,
                  )
                }
              />
              <LookupField
                id={fieldId("baseCurrency")}
                label={draft.task === "ADD_TRANSACTIONS" ? "Trade currency" : "Portfolio base currency"}
                value={draft.baseCurrency}
                options={currencyOptions}
                error={issueByField.get("baseCurrency")}
                onChange={(value) =>
                  onUpdate((current) =>
                    current.task === "ADD_POSITIONS" || current.task === "ADD_TRANSACTIONS"
                      ? { ...current, baseCurrency: value.toUpperCase() }
                      : current,
                  )
                }
              />
            </div>
            <IntakeRowsEditor
              draft={draft}
              instrumentOptions={instrumentOptions}
              currencyOptions={currencyOptions}
              issueFor={(field) => issueByField.get(field)}
              onChange={onUpdate}
            />
          </>
        ) : null}

        {draft.task === "ADD_INSTRUMENTS" || draft.task === "ADD_MARKET_DATA" ? (
          <IntakeRowsEditor
            draft={draft}
            instrumentOptions={instrumentOptions}
            currencyOptions={currencyOptions}
            issueFor={(field) => issueByField.get(field)}
            onChange={onUpdate}
          />
        ) : null}

        {draft.task === "IMPORT_FILE" ? (
          <FileImportEditor
            draft={draft}
            parseState={fileParseState}
            parseError={fileParseError}
            error={issueByField.get("file")}
            onParseFile={onParseFile}
          />
        ) : null}
      </div>
    </SectionBlock>
  );
}

function PortfolioProfileEditor({
  draft,
  portfolioOptions,
  currencyOptions,
  issueFor,
  onUpdate,
}: {
  draft: CreatePortfolioDraft;
  portfolioOptions: string[];
  currencyOptions: string[];
  issueFor: (field: string) => string | undefined;
  onUpdate: (updater: (current: IntakeDraft) => IntakeDraft) => void;
}) {
  function update(patch: Partial<CreatePortfolioDraft["input"]>) {
    onUpdate((current) =>
      current.task === "CREATE_PORTFOLIO"
        ? { ...current, input: { ...current.input, ...patch } }
        : current,
    );
  }

  return (
    <div className={styles.fieldGrid}>
      <LookupField
        id={fieldId("portfolioId")}
        label="New portfolio code"
        value={draft.input.portfolioId}
        options={portfolioOptions}
        error={issueFor("portfolioId")}
        onChange={(value) => update({ portfolioId: value })}
      />
      <InputField
        id={fieldId("cifId")}
        label="Client reference"
        value={draft.input.cifId}
        error={issueFor("cifId")}
        onChange={(value) => update({ cifId: value })}
      />
      <InputField
        id={fieldId("advisorId")}
        label="Responsible advisor code"
        value={draft.input.advisorId}
        error={issueFor("advisorId")}
        onChange={(value) => update({ advisorId: value })}
      />
      <LookupField
        id={fieldId("baseCurrency")}
        label="Base currency"
        value={draft.input.baseCurrency}
        options={currencyOptions}
        error={issueFor("baseCurrency")}
        onChange={(value) => update({ baseCurrency: value.toUpperCase() })}
      />
      <InputField
        id={fieldId("openDate")}
        label="Opening date"
        value={draft.input.openDate}
        type="date"
        error={issueFor("openDate")}
        onChange={(value) => update({ openDate: value })}
      />
      <InputField
        id={fieldId("bookingCenter")}
        label="Booking centre"
        value={draft.input.bookingCenter}
        error={issueFor("bookingCenter")}
        onChange={(value) => update({ bookingCenter: value })}
      />
      <InputField
        id={fieldId("portfolioType")}
        label="Mandate type"
        value={draft.input.portfolioType}
        error={issueFor("portfolioType")}
        onChange={(value) => update({ portfolioType: value })}
      />
      <InputField
        id={fieldId("riskExposure")}
        label="Approved risk profile"
        value={draft.input.riskExposure}
        error={issueFor("riskExposure")}
        onChange={(value) => update({ riskExposure: value })}
      />
      <InputField
        id={fieldId("investmentTimeHorizon")}
        label="Investment time horizon"
        value={draft.input.investmentTimeHorizon}
        error={issueFor("investmentTimeHorizon")}
        onChange={(value) => update({ investmentTimeHorizon: value })}
      />
      <InputField
        id={fieldId("status")}
        label="Opening portfolio status"
        value={draft.input.status}
        error={issueFor("status")}
        onChange={(value) => update({ status: value })}
      />
    </div>
  );
}

function ReferenceDataSupport({
  state,
  onLoad,
}: {
  state: "manual" | "loading" | "available" | "unavailable";
  onLoad: () => void;
}) {
  const copy = {
    manual: {
      title: "Manual entry",
      body: "Reference suggestions are optional. Load current portfolio, instrument, and currency choices when useful.",
    },
    loading: {
      title: "Loading reference suggestions",
      body: "Manual entry remains available while current choices are requested.",
    },
    available: {
      title: "Reference suggestions available",
      body: "Current portfolio, instrument, and currency choices are available in the relevant fields.",
    },
    unavailable: {
      title: "Reference suggestions unavailable",
      body: "Manual entry remains available. Verify entered codes against the source system before review.",
    },
  }[state];

  return (
    <div className={styles.sourceSupport}>
      <div className={styles.sourceCopy}>
        <strong>{copy.title}</strong>
        <span>{copy.body}</span>
      </div>
      <div className={styles.sourceActions}>
        <ActionButton onClick={onLoad} disabled={state === "loading"}>
          {state === "manual" ? "Load reference data" : "Refresh reference data"}
        </ActionButton>
      </div>
    </div>
  );
}

function ValidationSummary({ issues }: { issues: IntakeValidationIssue[] }) {
  return (
    <Alert severity="error" role="alert">
      <div className={styles.validationSummary}>
        <strong>Resolve the following before review</strong>
        <ul className={styles.validationList}>
          {issues.map((issue) => (
            <li key={`${issue.field}-${issue.message}`}>
              <a href={`#${fieldId(issue.field)}`}>{issue.message}</a>
            </li>
          ))}
        </ul>
      </div>
    </Alert>
  );
}

function FileImportEditor({
  draft,
  parseState,
  parseError,
  error,
  onParseFile,
}: {
  draft: Extract<IntakeDraft, { task: "IMPORT_FILE" }>;
  parseState: "idle" | "parsing" | "ready" | "error";
  parseError: string | null;
  error?: string;
  onParseFile: (file: File) => void;
}) {
  return (
    <div className={styles.editorStack}>
      <div className={styles.fileDrop}>
        <label htmlFor={fieldId("file")}>Supported CSV intake file</label>
        <input
          id={fieldId("file")}
          type="file"
          accept=".csv,text/csv"
          disabled={parseState === "parsing"}
          aria-describedby={error ? `${fieldId("file")}-error` : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onParseFile(file);
          }}
        />
        <span className={styles.taskDescription}>
          The file is parsed and checked in the browser first. Choosing a file does not publish data.
        </span>
        {error ? (
          <span id={`${fieldId("file")}-error`} className={styles.taskDescription}>
            {error}
          </span>
        ) : null}
      </div>

      {parseState === "parsing" ? <Alert severity="info">Preparing the file for review…</Alert> : null}
      {parseError ? <Alert severity="error">{parseError}</Alert> : null}
      {draft.payload && draft.fileName ? (
        <dl className={styles.fileSummary} aria-label="Parsed file summary">
          {[
            ["File", draft.fileName],
            ["Portfolios", String(draft.payload.portfolios.length)],
            ["Instruments", String(draft.payload.instruments.length)],
            ["Transactions", String(draft.payload.transactions.length)],
            ["Price observations", String(draft.payload.marketPrices.length)],
          ].map(([label, value]) => (
            <div className={styles.factRow} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
