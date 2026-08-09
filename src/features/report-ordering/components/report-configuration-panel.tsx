"use client";

import { FieldLabel, SectionBlock, SemanticBadge } from "@/design-system";

import type { ReportOrderingConfiguration, ReportOrderingViewModel } from "../view-model";
import styles from "../report-ordering-workspace.module.css";

export function ReportConfigurationPanel({
  model,
  configuration,
  updateConfiguration,
  toggleSection,
}: {
  model: ReportOrderingViewModel;
  configuration: ReportOrderingConfiguration;
  updateConfiguration: (patch: Partial<ReportOrderingConfiguration>) => void;
  toggleSection: (sectionId: string) => void;
}) {
  const configurationFields = new Map(
    model.family?.configurationFields.map((field) => [field.fieldId, field]) ?? [],
  );
  const currencyField = configurationFields.get("reporting_currency");
  const benchmarkField = configurationFields.get("benchmark_code");
  const allocationField = configurationFields.get("allocation_dimensions");
  const selectedSectionCount = model.sectionChoices.filter(
    (section) => section.selected,
  ).length;

  return (
    <div className={styles.configurationStack}>
      <SectionBlock
        title="Approved report"
        subtitle="Available choices are maintained by Reporting and filtered for your role."
        className={styles.section}
      >
        <fieldset className={styles.choiceFieldset}>
          <legend className={styles.srOnly}>Select an approved report</legend>
          <div className={styles.familyGrid}>
            {model.eligibleFamilies.map((family) => {
              const selected = family.reportFamilyId === configuration.familyId;
              return (
                <label
                  key={family.reportFamilyId}
                  className={`${styles.choiceCard} ${selected ? styles.choiceCardSelected : ""}`}
                >
                  <input
                    type="radio"
                    name="report-family"
                    value={family.reportFamilyId}
                    checked={selected}
                    onChange={() => updateConfiguration({ familyId: family.reportFamilyId })}
                  />
                  <span className={styles.choiceBody}>
                    <span className={styles.choiceHeading}>
                      <strong>{family.businessLabel}</strong>
                      <SemanticBadge tone={family.availability.state === "ready" ? "success" : "warn"}>
                        {family.availability.state === "ready" ? "Available" : "Available with limits"}
                      </SemanticBadge>
                    </span>
                    <span>{family.description}</span>
                    <small>{family.availability.message}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {model.workflowManagedFamilies.length ? (
          <div className={styles.workflowManagedGroup}>
            <div className={styles.workflowManagedHeading}>
              <div>
                <strong>Created through business workflows</strong>
                <p>
                  These evidence packs are created from their originating advisory or
                  portfolio-management process, rather than ordered here.
                </p>
              </div>
              <SemanticBadge>Workflow generated</SemanticBadge>
            </div>
            <div className={styles.workflowManagedGrid}>
              {model.workflowManagedFamilies.map((family) => (
                <article key={family.reportFamilyId} className={styles.workflowManagedCard}>
                  <strong>{family.businessLabel}</strong>
                  <span>{family.description}</span>
                  <small>
                    {family.orderingModes[0]?.description ??
                      "Open the originating business workflow to create this evidence."}
                  </small>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </SectionBlock>

      <SectionBlock
        title="Report setup"
        subtitle="Set the business date and portfolio-level reporting context."
        className={styles.section}
      >
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <FieldLabel htmlFor="report-ordering-as-of-date">Report date</FieldLabel>
            <input
              id="report-ordering-as-of-date"
              className="workbench-input"
              type="date"
              value={configuration.asOfDate}
              onChange={(event) => updateConfiguration({ asOfDate: event.target.value })}
              aria-describedby="report-ordering-as-of-help"
            />
            <small id="report-ordering-as-of-help">
              Holdings, activity, performance, and risk evidence are evaluated for this date.
            </small>
          </div>
          {currencyField ? (
            <div className={styles.fieldGroup}>
              <FieldLabel htmlFor="report-ordering-currency">
                {currencyField.businessLabel}
              </FieldLabel>
              <input
                id="report-ordering-currency"
                className="workbench-input"
                inputMode="text"
                maxLength={3}
                value={configuration.reportingCurrency}
                onChange={(event) =>
                  updateConfiguration({
                    reportingCurrency: event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z]/g, ""),
                  })
                }
                aria-describedby="report-ordering-currency-help"
              />
              <small id="report-ordering-currency-help">
                Leave blank to use the portfolio currency maintained by the source record.
              </small>
            </div>
          ) : null}
          {benchmarkField ? (
            <div className={styles.fieldGroup}>
              <span className="workbench-field-label">
                {benchmarkField.businessLabel}
              </span>
              <div className={styles.sourceDefault}>Portfolio benchmark</div>
              <small>Reporting applies the eligible benchmark from portfolio context.</small>
            </div>
          ) : null}
        </div>

        {allocationField?.options.length ? (
          <fieldset className={styles.optionFieldset}>
            <legend>{allocationField.businessLabel}</legend>
            <p>{allocationField.description}</p>
            <div className={styles.checkGrid}>
              {allocationField.options.map((option) => (
                <label key={option.value} className={styles.checkChoice}>
                  <input
                    type="checkbox"
                    checked={configuration.allocationDimensions.includes(option.value)}
                    onChange={() =>
                      updateConfiguration({
                        allocationDimensions: configuration.allocationDimensions.includes(option.value)
                          ? configuration.allocationDimensions.filter((value) => value !== option.value)
                          : [...configuration.allocationDimensions, option.value],
                      })
                    }
                  />
                  <span>{option.businessLabel}</span>
                </label>
              ))}
            </div>
            <small>With no selection, Reporting applies the default allocation view maintained for this portfolio.</small>
          </fieldset>
        ) : null}
      </SectionBlock>

      <SectionBlock
        title="Report contents"
        subtitle={`${selectedSectionCount} of ${model.sectionChoices.length} sections included. Required sections remain selected.`}
        className={styles.section}
      >
        <details
          className={styles.contentDisclosure}
          open={model.readiness.state === "blocked" ? true : undefined}
        >
          <summary className={styles.contentSummary}>
            <span className={styles.contentSummaryCopy}>
              <strong>Review report contents</strong>
              <small>Open to tailor optional sections for this client review.</small>
            </span>
            <SemanticBadge>{selectedSectionCount} included</SemanticBadge>
          </summary>
          <fieldset className={styles.contentChoices}>
            <legend className={styles.srOnly}>Select report sections</legend>
            <div className={styles.sectionChoiceGrid}>
              {model.sectionChoices.map((section) => (
                <label key={section.id} className={styles.sectionChoice}>
                  <input
                    type="checkbox"
                    checked={section.selected}
                    disabled={section.required}
                    onChange={() => toggleSection(section.id)}
                  />
                  <span className={styles.choiceBody}>
                    <span className={styles.choiceHeading}>
                      <strong>{section.label}</strong>
                      {section.required ? <SemanticBadge>Required</SemanticBadge> : null}
                    </span>
                    <span>{section.detail}</span>
                    {section.dependencyLabels.length ? (
                      <small>Uses {section.dependencyLabels.join(" and ").toLowerCase()}.</small>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </details>
      </SectionBlock>

      <SectionBlock
        title="Output"
        subtitle="Data readiness and governed-document readiness are assessed independently."
        className={styles.section}
      >
        <fieldset className={styles.choiceFieldset}>
          <legend className={styles.srOnly}>Select report output</legend>
          <div className={styles.outputGrid}>
            {model.outputChoices.map((output) => (
              <label
                key={output.id}
                className={`${styles.choiceCard} ${
                  configuration.outputFormat === output.id ? styles.choiceCardSelected : ""
                } ${!output.available ? styles.choiceCardDisabled : ""}`}
              >
                <input
                  type="radio"
                  name="report-output"
                  value={output.id}
                  checked={configuration.outputFormat === output.id}
                  disabled={!output.available}
                  onChange={() => updateConfiguration({ outputFormat: output.id })}
                />
                <span className={styles.choiceBody}>
                  <span className={styles.choiceHeading}>
                    <strong>{output.label}</strong>
                    <SemanticBadge tone={output.available ? "success" : "warn"}>
                      {output.available ? "Available" : "Unavailable"}
                    </SemanticBadge>
                  </span>
                  <span>{output.detail}</span>
                  <small>{output.supportReason}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </SectionBlock>
    </div>
  );
}
