import { Autocomplete, TextField } from "@mui/material";

import { ActionButton } from "@/design-system";

import {
  blankInstrument,
  blankMarketData,
  blankPosition,
  blankTransaction,
  createIntakeRowId,
  type InstrumentsDraft,
  type IntakeDraft,
  type MarketDataDraft,
  type PositionsDraft,
  type TransactionsDraft,
} from "../draft";
import styles from "../intake-workspace.module.css";

type RowDraft = PositionsDraft | TransactionsDraft | InstrumentsDraft | MarketDataDraft;

export function IntakeRowsEditor({
  draft,
  instrumentOptions,
  currencyOptions,
  issueFor,
  onChange,
}: {
  draft: RowDraft;
  instrumentOptions: string[];
  currencyOptions: string[];
  issueFor: (field: string) => string | undefined;
  onChange: (updater: (current: IntakeDraft) => IntakeDraft) => void;
}) {
  switch (draft.task) {
    case "ADD_POSITIONS":
      return (
        <PositionRows
          draft={draft}
          instrumentOptions={instrumentOptions}
          issueFor={issueFor}
          onChange={onChange}
        />
      );
    case "ADD_TRANSACTIONS":
      return (
        <TransactionRows
          draft={draft}
          instrumentOptions={instrumentOptions}
          issueFor={issueFor}
          onChange={onChange}
        />
      );
    case "ADD_INSTRUMENTS":
      return (
        <InstrumentRows
          draft={draft}
          instrumentOptions={instrumentOptions}
          currencyOptions={currencyOptions}
          issueFor={issueFor}
          onChange={onChange}
        />
      );
    case "ADD_MARKET_DATA":
      return (
        <MarketDataRows
          draft={draft}
          instrumentOptions={instrumentOptions}
          currencyOptions={currencyOptions}
          issueFor={issueFor}
          onChange={onChange}
        />
      );
  }
}

function PositionRows({
  draft,
  instrumentOptions,
  issueFor,
  onChange,
}: {
  draft: PositionsDraft;
  instrumentOptions: string[];
  issueFor: (field: string) => string | undefined;
  onChange: (updater: (current: IntakeDraft) => IntakeDraft) => void;
}) {
  function update(rowId: string, patch: Partial<PositionsDraft["rows"][number]["value"]>) {
    onChange((current) =>
      current.task === "ADD_POSITIONS"
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.rowId === rowId ? { ...row, value: { ...row.value, ...patch } } : row,
            ),
          }
        : current,
    );
  }

  return (
    <RowCollection
      empty={draft.rows.length === 0}
      emptyLabel="No position rows. Add a blank row to continue."
      addLabel="Add position"
      onAdd={() =>
        onChange((current) =>
          current.task === "ADD_POSITIONS"
            ? { ...current, rows: [...current.rows, { rowId: createIntakeRowId(), value: blankPosition() }] }
            : current,
        )
      }
    >
      {draft.rows.map((row, index) => {
        const prefix = `rows.${row.rowId}`;
        return (
          <RowCard
            key={row.rowId}
            title={`Position ${index + 1}`}
            removeLabel={`Remove position ${index + 1}`}
            onRemove={() =>
              onChange((current) =>
                current.task === "ADD_POSITIONS"
                  ? { ...current, rows: current.rows.filter((item) => item.rowId !== row.rowId) }
                  : current,
              )
            }
          >
            <div className={styles.positionGrid}>
              <LookupField
                id={fieldId(`${prefix}.securityId`)}
                label={`Security code, position ${index + 1}`}
                value={row.value.securityId}
                options={instrumentOptions}
                error={issueFor(`${prefix}.securityId`)}
                onChange={(value) => update(row.rowId, { securityId: value })}
              />
              <InputField
                id={fieldId(`${prefix}.instrumentName`)}
                label={`Instrument name, position ${index + 1}`}
                value={row.value.instrumentName}
                error={issueFor(`${prefix}.instrumentName`)}
                onChange={(value) => update(row.rowId, { instrumentName: value })}
              />
              <InputField
                id={fieldId(`${prefix}.isin`)}
                label={`ISIN, position ${index + 1}`}
                value={row.value.isin}
                error={issueFor(`${prefix}.isin`)}
                onChange={(value) => update(row.rowId, { isin: value.toUpperCase() })}
              />
              <InputField
                id={fieldId(`${prefix}.productType`)}
                label={`Product type, position ${index + 1}`}
                value={row.value.productType}
                error={issueFor(`${prefix}.productType`)}
                onChange={(value) => update(row.rowId, { productType: value })}
              />
              <NumberField
                id={fieldId(`${prefix}.quantity`)}
                label={`Quantity, position ${index + 1}`}
                value={row.value.quantity}
                error={issueFor(`${prefix}.quantity`)}
                onChange={(value) => update(row.rowId, { quantity: value })}
              />
              <NumberField
                id={fieldId(`${prefix}.price`)}
                label={`Price, position ${index + 1}`}
                value={row.value.price}
                error={issueFor(`${prefix}.price`)}
                onChange={(value) => update(row.rowId, { price: value })}
              />
              <InputField
                id={fieldId(`${prefix}.effectiveDate`)}
                label={`Effective date, position ${index + 1}`}
                value={row.value.effectiveDate}
                type="date"
                error={issueFor(`${prefix}.effectiveDate`)}
                onChange={(value) => update(row.rowId, { effectiveDate: value })}
              />
              <InputField
                id={fieldId(`${prefix}.transactionType`)}
                label={`Booking type, position ${index + 1}`}
                value={row.value.transactionType}
                error={issueFor(`${prefix}.transactionType`)}
                onChange={(value) => update(row.rowId, { transactionType: value.toUpperCase() })}
              />
            </div>
          </RowCard>
        );
      })}
    </RowCollection>
  );
}

function TransactionRows({
  draft,
  instrumentOptions,
  issueFor,
  onChange,
}: {
  draft: TransactionsDraft;
  instrumentOptions: string[];
  issueFor: (field: string) => string | undefined;
  onChange: (updater: (current: IntakeDraft) => IntakeDraft) => void;
}) {
  function update(rowId: string, patch: Partial<TransactionsDraft["rows"][number]["value"]>) {
    onChange((current) =>
      current.task === "ADD_TRANSACTIONS"
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.rowId === rowId ? { ...row, value: { ...row.value, ...patch } } : row,
            ),
          }
        : current,
    );
  }

  return (
    <RowCollection
      empty={draft.rows.length === 0}
      emptyLabel="No transaction rows. Add a blank row to continue."
      addLabel="Add transaction"
      onAdd={() =>
        onChange((current) =>
          current.task === "ADD_TRANSACTIONS"
            ? { ...current, rows: [...current.rows, { rowId: createIntakeRowId(), value: blankTransaction() }] }
            : current,
        )
      }
    >
      {draft.rows.map((row, index) => {
        const prefix = `rows.${row.rowId}`;
        return (
          <RowCard
            key={row.rowId}
            title={`Transaction ${index + 1}`}
            removeLabel={`Remove transaction ${index + 1}`}
            onRemove={() =>
              onChange((current) =>
                current.task === "ADD_TRANSACTIONS"
                  ? { ...current, rows: current.rows.filter((item) => item.rowId !== row.rowId) }
                  : current,
              )
            }
          >
            <div className={styles.transactionGrid}>
              <LookupField
                id={fieldId(`${prefix}.securityId`)}
                label={`Security code, transaction ${index + 1}`}
                value={row.value.securityId}
                options={instrumentOptions}
                error={issueFor(`${prefix}.securityId`)}
                onChange={(value) => update(row.rowId, { securityId: value })}
              />
              <InputField
                id={fieldId(`${prefix}.transactionType`)}
                label={`Transaction type, row ${index + 1}`}
                value={row.value.transactionType}
                error={issueFor(`${prefix}.transactionType`)}
                onChange={(value) => update(row.rowId, { transactionType: value.toUpperCase() })}
              />
              <NumberField
                id={fieldId(`${prefix}.quantity`)}
                label={`Quantity, transaction ${index + 1}`}
                value={row.value.quantity}
                error={issueFor(`${prefix}.quantity`)}
                onChange={(value) => update(row.rowId, { quantity: value })}
              />
              <NumberField
                id={fieldId(`${prefix}.price`)}
                label={`Price, transaction ${index + 1}`}
                value={row.value.price}
                error={issueFor(`${prefix}.price`)}
                onChange={(value) => update(row.rowId, { price: value })}
              />
              <InputField
                id={fieldId(`${prefix}.transactionDate`)}
                label={`Trade date, transaction ${index + 1}`}
                value={row.value.transactionDate}
                type="date"
                error={issueFor(`${prefix}.transactionDate`)}
                onChange={(value) => update(row.rowId, { transactionDate: value })}
              />
            </div>
          </RowCard>
        );
      })}
    </RowCollection>
  );
}

function InstrumentRows({
  draft,
  instrumentOptions,
  currencyOptions,
  issueFor,
  onChange,
}: {
  draft: InstrumentsDraft;
  instrumentOptions: string[];
  currencyOptions: string[];
  issueFor: (field: string) => string | undefined;
  onChange: (updater: (current: IntakeDraft) => IntakeDraft) => void;
}) {
  function update(rowId: string, patch: Partial<InstrumentsDraft["rows"][number]["value"]>) {
    onChange((current) =>
      current.task === "ADD_INSTRUMENTS"
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.rowId === rowId ? { ...row, value: { ...row.value, ...patch } } : row,
            ),
          }
        : current,
    );
  }

  return (
    <RowCollection
      empty={draft.rows.length === 0}
      emptyLabel="No instrument rows. Add a blank row to continue."
      addLabel="Add instrument"
      onAdd={() =>
        onChange((current) =>
          current.task === "ADD_INSTRUMENTS"
            ? { ...current, rows: [...current.rows, { rowId: createIntakeRowId(), value: blankInstrument() }] }
            : current,
        )
      }
    >
      {draft.rows.map((row, index) => {
        const prefix = `rows.${row.rowId}`;
        return (
          <RowCard
            key={row.rowId}
            title={`Instrument ${index + 1}`}
            removeLabel={`Remove instrument ${index + 1}`}
            onRemove={() =>
              onChange((current) =>
                current.task === "ADD_INSTRUMENTS"
                  ? { ...current, rows: current.rows.filter((item) => item.rowId !== row.rowId) }
                  : current,
              )
            }
          >
            <div className={styles.instrumentGrid}>
              <LookupField
                id={fieldId(`${prefix}.securityId`)}
                label={`Security code, instrument ${index + 1}`}
                value={row.value.securityId}
                options={instrumentOptions}
                error={issueFor(`${prefix}.securityId`)}
                onChange={(value) => update(row.rowId, { securityId: value })}
              />
              <InputField
                id={fieldId(`${prefix}.name`)}
                label={`Instrument name, row ${index + 1}`}
                value={row.value.name}
                error={issueFor(`${prefix}.name`)}
                onChange={(value) => update(row.rowId, { name: value })}
              />
              <InputField
                id={fieldId(`${prefix}.isin`)}
                label={`ISIN, instrument ${index + 1}`}
                value={row.value.isin}
                error={issueFor(`${prefix}.isin`)}
                onChange={(value) => update(row.rowId, { isin: value.toUpperCase() })}
              />
              <LookupField
                id={fieldId(`${prefix}.instrumentCurrency`)}
                label={`Currency, instrument ${index + 1}`}
                value={row.value.instrumentCurrency}
                options={currencyOptions}
                error={issueFor(`${prefix}.instrumentCurrency`)}
                onChange={(value) => update(row.rowId, { instrumentCurrency: value.toUpperCase() })}
              />
              <InputField
                id={fieldId(`${prefix}.productType`)}
                label={`Product type, instrument ${index + 1}`}
                value={row.value.productType}
                error={issueFor(`${prefix}.productType`)}
                onChange={(value) => update(row.rowId, { productType: value })}
              />
              <InputField
                id={fieldId(`${prefix}.assetClass`)}
                label={`Asset class, instrument ${index + 1}`}
                value={row.value.assetClass}
                error={issueFor(`${prefix}.assetClass`)}
                onChange={(value) => update(row.rowId, { assetClass: value })}
              />
            </div>
          </RowCard>
        );
      })}
    </RowCollection>
  );
}

function MarketDataRows({
  draft,
  instrumentOptions,
  currencyOptions,
  issueFor,
  onChange,
}: {
  draft: MarketDataDraft;
  instrumentOptions: string[];
  currencyOptions: string[];
  issueFor: (field: string) => string | undefined;
  onChange: (updater: (current: IntakeDraft) => IntakeDraft) => void;
}) {
  function update(rowId: string, patch: Partial<MarketDataDraft["rows"][number]["value"]>) {
    onChange((current) =>
      current.task === "ADD_MARKET_DATA"
        ? {
            ...current,
            rows: current.rows.map((row) =>
              row.rowId === rowId ? { ...row, value: { ...row.value, ...patch } } : row,
            ),
          }
        : current,
    );
  }

  return (
    <RowCollection
      empty={draft.rows.length === 0}
      emptyLabel="No price observations. Add a blank row to continue."
      addLabel="Add price observation"
      onAdd={() =>
        onChange((current) =>
          current.task === "ADD_MARKET_DATA"
            ? { ...current, rows: [...current.rows, { rowId: createIntakeRowId(), value: blankMarketData() }] }
            : current,
        )
      }
    >
      {draft.rows.map((row, index) => {
        const prefix = `rows.${row.rowId}`;
        return (
          <RowCard
            key={row.rowId}
            title={`Price observation ${index + 1}`}
            removeLabel={`Remove price observation ${index + 1}`}
            onRemove={() =>
              onChange((current) =>
                current.task === "ADD_MARKET_DATA"
                  ? { ...current, rows: current.rows.filter((item) => item.rowId !== row.rowId) }
                  : current,
              )
            }
          >
            <div className={styles.marketGrid}>
              <LookupField
                id={fieldId(`${prefix}.securityId`)}
                label={`Security code, price ${index + 1}`}
                value={row.value.securityId}
                options={instrumentOptions}
                error={issueFor(`${prefix}.securityId`)}
                onChange={(value) => update(row.rowId, { securityId: value })}
              />
              <InputField
                id={fieldId(`${prefix}.priceDate`)}
                label={`Observation date, price ${index + 1}`}
                value={row.value.priceDate}
                type="date"
                error={issueFor(`${prefix}.priceDate`)}
                onChange={(value) => update(row.rowId, { priceDate: value })}
              />
              <NumberField
                id={fieldId(`${prefix}.price`)}
                label={`Price, observation ${index + 1}`}
                value={row.value.price}
                error={issueFor(`${prefix}.price`)}
                onChange={(value) => update(row.rowId, { price: value })}
              />
              <LookupField
                id={fieldId(`${prefix}.currency`)}
                label={`Currency, price ${index + 1}`}
                value={row.value.currency}
                options={currencyOptions}
                error={issueFor(`${prefix}.currency`)}
                onChange={(value) => update(row.rowId, { currency: value.toUpperCase() })}
              />
            </div>
          </RowCard>
        );
      })}
    </RowCollection>
  );
}

function RowCollection({
  empty,
  emptyLabel,
  addLabel,
  onAdd,
  children,
}: {
  empty: boolean;
  emptyLabel: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div id={fieldId("rows")} className={styles.rows}>
      {empty ? <div className={styles.emptyRows}>{emptyLabel}</div> : children}
      <div className={styles.rowActions}>
        <ActionButton onClick={onAdd}>{addLabel}</ActionButton>
      </div>
    </div>
  );
}

function RowCard({
  title,
  removeLabel,
  onRemove,
  children,
}: {
  title: string;
  removeLabel: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.rowCard} aria-label={title}>
      <div className={styles.rowHeader}>
        <strong>{title}</strong>
        <ActionButton priority="quiet" aria-label={removeLabel} onClick={onRemove}>
          Remove
        </ActionButton>
      </div>
      {children}
    </section>
  );
}

export function LookupField({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Autocomplete
      freeSolo
      options={options}
      value={value}
      onInputChange={(_event, next) => onChange(next)}
      renderInput={(params) => (
        <TextField
          {...params}
          id={id}
          label={label}
          size="small"
          error={Boolean(error)}
          helperText={error}
        />
      )}
    />
  );
}

export function InputField({
  id,
  label,
  value,
  error,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: "text" | "date";
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      id={id}
      fullWidth
      size="small"
      type={type}
      label={label}
      value={value}
      error={Boolean(error)}
      helperText={error}
      onChange={(event) => onChange(event.target.value)}
      slotProps={type === "date" ? { inputLabel: { shrink: true } } : undefined}
    />
  );
}

function NumberField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  error?: string;
  onChange: (value: number) => void;
}) {
  return (
    <TextField
      id={id}
      fullWidth
      size="small"
      type="number"
      label={label}
      value={value || ""}
      error={Boolean(error)}
      helperText={error}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      slotProps={{ htmlInput: { min: 0, step: "any" } }}
    />
  );
}

export function fieldId(field: string): string {
  return `intake-${field.replaceAll(".", "-")}`;
}
