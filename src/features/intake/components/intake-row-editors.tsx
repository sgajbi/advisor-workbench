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
  disabled = false,
  onChange,
}: {
  draft: RowDraft;
  instrumentOptions: string[];
  currencyOptions: string[];
  issueFor: (field: string) => string | undefined;
  disabled?: boolean;
  onChange: (updater: (current: IntakeDraft) => IntakeDraft) => void;
}) {
  switch (draft.task) {
    case "ADD_POSITIONS":
      return (
        <PositionRows
          draft={draft}
          instrumentOptions={instrumentOptions}
          issueFor={issueFor}
          disabled={disabled}
          onChange={onChange}
        />
      );
    case "ADD_TRANSACTIONS":
      return (
        <TransactionRows
          draft={draft}
          instrumentOptions={instrumentOptions}
          issueFor={issueFor}
          disabled={disabled}
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
          disabled={disabled}
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
          disabled={disabled}
          onChange={onChange}
        />
      );
  }
}

function PositionRows({
  draft,
  instrumentOptions,
  issueFor,
  disabled,
  onChange,
}: {
  draft: PositionsDraft;
  instrumentOptions: string[];
  issueFor: (field: string) => string | undefined;
  disabled: boolean;
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
      disabled={disabled}
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
            disabled={disabled}
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
                disabled={disabled}
                onChange={(value) => update(row.rowId, { securityId: value })}
              />
              <InputField
                id={fieldId(`${prefix}.instrumentName`)}
                label={`Instrument name, position ${index + 1}`}
                value={row.value.instrumentName}
                error={issueFor(`${prefix}.instrumentName`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { instrumentName: value })}
              />
              <InputField
                id={fieldId(`${prefix}.isin`)}
                label={`ISIN, position ${index + 1}`}
                value={row.value.isin}
                error={issueFor(`${prefix}.isin`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { isin: value.toUpperCase() })}
              />
              <InputField
                id={fieldId(`${prefix}.productType`)}
                label={`Product type, position ${index + 1}`}
                value={row.value.productType}
                error={issueFor(`${prefix}.productType`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { productType: value })}
              />
              <NumberField
                id={fieldId(`${prefix}.quantity`)}
                label={`Quantity, position ${index + 1}`}
                value={row.value.quantity}
                error={issueFor(`${prefix}.quantity`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { quantity: value })}
              />
              <NumberField
                id={fieldId(`${prefix}.price`)}
                label={`Price, position ${index + 1}`}
                value={row.value.price}
                error={issueFor(`${prefix}.price`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { price: value })}
              />
              <InputField
                id={fieldId(`${prefix}.effectiveDate`)}
                label={`Effective date, position ${index + 1}`}
                value={row.value.effectiveDate}
                type="date"
                error={issueFor(`${prefix}.effectiveDate`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { effectiveDate: value })}
              />
              <InputField
                id={fieldId(`${prefix}.transactionType`)}
                label={`Booking type, position ${index + 1}`}
                value={row.value.transactionType}
                error={issueFor(`${prefix}.transactionType`)}
                disabled={disabled}
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
  disabled,
  onChange,
}: {
  draft: TransactionsDraft;
  instrumentOptions: string[];
  issueFor: (field: string) => string | undefined;
  disabled: boolean;
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
      disabled={disabled}
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
            disabled={disabled}
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
                disabled={disabled}
                onChange={(value) => update(row.rowId, { securityId: value })}
              />
              <InputField
                id={fieldId(`${prefix}.transactionType`)}
                label={`Transaction type, row ${index + 1}`}
                value={row.value.transactionType}
                error={issueFor(`${prefix}.transactionType`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { transactionType: value.toUpperCase() })}
              />
              <NumberField
                id={fieldId(`${prefix}.quantity`)}
                label={`Quantity, transaction ${index + 1}`}
                value={row.value.quantity}
                error={issueFor(`${prefix}.quantity`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { quantity: value })}
              />
              <NumberField
                id={fieldId(`${prefix}.price`)}
                label={`Price, transaction ${index + 1}`}
                value={row.value.price}
                error={issueFor(`${prefix}.price`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { price: value })}
              />
              <InputField
                id={fieldId(`${prefix}.transactionDate`)}
                label={`Trade date, transaction ${index + 1}`}
                value={row.value.transactionDate}
                type="date"
                error={issueFor(`${prefix}.transactionDate`)}
                disabled={disabled}
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
  disabled,
  onChange,
}: {
  draft: InstrumentsDraft;
  instrumentOptions: string[];
  currencyOptions: string[];
  issueFor: (field: string) => string | undefined;
  disabled: boolean;
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
      disabled={disabled}
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
            disabled={disabled}
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
                disabled={disabled}
                onChange={(value) => update(row.rowId, { securityId: value })}
              />
              <InputField
                id={fieldId(`${prefix}.name`)}
                label={`Instrument name, row ${index + 1}`}
                value={row.value.name}
                error={issueFor(`${prefix}.name`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { name: value })}
              />
              <InputField
                id={fieldId(`${prefix}.isin`)}
                label={`ISIN, instrument ${index + 1}`}
                value={row.value.isin}
                error={issueFor(`${prefix}.isin`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { isin: value.toUpperCase() })}
              />
              <LookupField
                id={fieldId(`${prefix}.instrumentCurrency`)}
                label={`Currency, instrument ${index + 1}`}
                value={row.value.instrumentCurrency}
                options={currencyOptions}
                error={issueFor(`${prefix}.instrumentCurrency`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { instrumentCurrency: value.toUpperCase() })}
              />
              <InputField
                id={fieldId(`${prefix}.productType`)}
                label={`Product type, instrument ${index + 1}`}
                value={row.value.productType}
                error={issueFor(`${prefix}.productType`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { productType: value })}
              />
              <InputField
                id={fieldId(`${prefix}.assetClass`)}
                label={`Asset class, instrument ${index + 1}`}
                value={row.value.assetClass}
                error={issueFor(`${prefix}.assetClass`)}
                disabled={disabled}
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
  disabled,
  onChange,
}: {
  draft: MarketDataDraft;
  instrumentOptions: string[];
  currencyOptions: string[];
  issueFor: (field: string) => string | undefined;
  disabled: boolean;
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
      disabled={disabled}
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
            disabled={disabled}
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
                disabled={disabled}
                onChange={(value) => update(row.rowId, { securityId: value })}
              />
              <InputField
                id={fieldId(`${prefix}.priceDate`)}
                label={`Observation date, price ${index + 1}`}
                value={row.value.priceDate}
                type="date"
                error={issueFor(`${prefix}.priceDate`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { priceDate: value })}
              />
              <NumberField
                id={fieldId(`${prefix}.price`)}
                label={`Price, observation ${index + 1}`}
                value={row.value.price}
                error={issueFor(`${prefix}.price`)}
                disabled={disabled}
                onChange={(value) => update(row.rowId, { price: value })}
              />
              <LookupField
                id={fieldId(`${prefix}.currency`)}
                label={`Currency, price ${index + 1}`}
                value={row.value.currency}
                options={currencyOptions}
                error={issueFor(`${prefix}.currency`)}
                disabled={disabled}
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
  disabled,
  onAdd,
  children,
}: {
  empty: boolean;
  emptyLabel: string;
  addLabel: string;
  disabled: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div id={fieldId("rows")} className={styles.rows}>
      {empty ? <div className={styles.emptyRows}>{emptyLabel}</div> : children}
      <div className={styles.rowActions}>
        <ActionButton onClick={onAdd} disabled={disabled}>
          {addLabel}
        </ActionButton>
      </div>
    </div>
  );
}

function RowCard({
  title,
  removeLabel,
  disabled,
  onRemove,
  children,
}: {
  title: string;
  removeLabel: string;
  disabled: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.rowCard} aria-label={title}>
      <div className={styles.rowHeader}>
        <strong>{title}</strong>
        <ActionButton priority="quiet" aria-label={removeLabel} onClick={onRemove} disabled={disabled}>
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
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Autocomplete
      freeSolo
      options={options}
      value={value}
      disabled={disabled}
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
  disabled = false,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
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
      disabled={disabled}
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
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  error?: string;
  disabled?: boolean;
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
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      slotProps={{ htmlInput: { min: 0, step: "any" } }}
    />
  );
}

export function fieldId(field: string): string {
  return `intake-${field.replaceAll(".", "-")}`;
}
