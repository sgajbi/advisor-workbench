"use client";

import { useRef } from "react";

import {
  AppPageShell,
  MainWithSideRailLayout,
  SectionBlock,
  SemanticBadge,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import { INTAKE_TASKS } from "../draft";
import styles from "../intake-workspace.module.css";
import { useIntakeWorkflow } from "../use-intake-workflow";
import { IntakeEditorPanel } from "./intake-editor-panel";
import { IntakeReviewRail } from "./intake-review-rail";
import { IntakeTaskSelector } from "./intake-task-selector";

export function IntakeWorkspace() {
  const workflow = useIntakeWorkflow();
  const chooserRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const focusIntentRef = useRef(0);
  const activeTask = INTAKE_TASKS.find((item) => item.task === workflow.draft?.task);

  function focus(ref: React.RefObject<HTMLDivElement | null>) {
    requestAnimationFrame(() => ref.current?.focus());
  }

  function selectTask(task: Parameters<typeof workflow.selectTask>[0]) {
    workflow.selectTask(task);
    focus(editorRef);
  }

  function changeTask() {
    focusIntentRef.current += 1;
    workflow.startAnotherRequest();
    focus(chooserRef);
  }

  function reviewRequest() {
    if (workflow.reviewRequest()) {
      focus(reviewRef);
    } else {
      focus(editorRef);
    }
  }

  async function submitRequest() {
    const focusIntent = ++focusIntentRef.current;
    await workflow.submitReviewedRequest();
    if (focusIntentRef.current === focusIntent) focus(reviewRef);
  }

  function editReviewedRequest() {
    workflow.updateDraft((current) => current);
    focus(editorRef);
  }

  function startAnotherRequest() {
    focusIntentRef.current += 1;
    workflow.startAnotherRequest();
    focus(chooserRef);
  }

  return (
    <AppPageShell pageKey="intake" className={styles.page}>
      <WorkbenchPageContainer className={styles.container}>
        <MainWithSideRailLayout
          className={styles.layout}
          mainClassName={styles.main}
          sideClassName={styles.side}
          sideDensity="comfortable"
          main={
            <WorkbenchPageFrame
              className={styles.frame}
              title="Portfolio Intake"
              subtitle="Prepare, review, and publish governed portfolio data requests."
              actions={
                <>
                  <SemanticBadge>{activeTask?.title ?? "No request selected"}</SemanticBadge>
                  <SemanticBadge tone={workflow.receipt ? "success" : "default"}>
                    {workflow.receipt ? "Source confirmed" : "Review required"}
                  </SemanticBadge>
                </>
              }
            >
              <WorkbenchSectionStack className={styles.content}>
                {!workflow.draft ? (
                  <div
                    ref={chooserRef}
                    tabIndex={-1}
                    role="region"
                    aria-label="Choose an intake request"
                    className={styles.focusTarget}
                  >
                    <IntakeTaskSelector onSelect={selectTask} />
                  </div>
                ) : workflow.receipt ? (
                  <SectionBlock
                    title="Reviewed request published"
                    subtitle="Source confirmation is shown in Request control. Start another request when you are ready."
                  >
                    <p className={styles.reviewNote}>
                      The accepted request is locked on this screen to prevent an accidental edit from being mistaken for the published record.
                    </p>
                  </SectionBlock>
                ) : (
                  <div
                    ref={editorRef}
                    tabIndex={-1}
                    role="region"
                    aria-label="Intake request editor"
                    className={styles.focusTarget}
                  >
                    <IntakeEditorPanel
                      draft={workflow.draft}
                      validationAttempted={workflow.validationAttempted}
                      validationIssues={workflow.validationIssues}
                      referenceDataState={workflow.referenceDataState}
                      portfolioOptions={workflow.portfolioOptions}
                      instrumentOptions={workflow.instrumentOptions}
                      currencyOptions={workflow.currencyOptions}
                      fileParseState={workflow.fileParseState}
                      fileParseError={workflow.fileParseError}
                      onChangeTask={changeTask}
                      onLoadReferenceData={workflow.loadReferenceData}
                      onUpdate={workflow.updateDraft}
                      onParseFile={(file) => void workflow.parseFile(file)}
                    />
                  </div>
                )}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          }
          side={
            <div className={styles.stickyRail}>
              <div
                ref={reviewRef}
                tabIndex={-1}
                role="region"
                aria-label="Intake request control"
                className={styles.focusTarget}
              >
                <IntakeReviewRail
                  hasDraft={Boolean(workflow.draft)}
                  isPreparing={workflow.fileParseState === "parsing"}
                  issueCount={workflow.validationIssues.length}
                  reviewedProjection={workflow.reviewedIntent?.projection ?? null}
                  submissionState={workflow.submissionState}
                  submissionError={workflow.submissionError}
                  receipt={workflow.receipt}
                  onReview={reviewRequest}
                  onSubmit={() => void submitRequest()}
                  onEdit={editReviewedRequest}
                  onStartAnother={startAnotherRequest}
                />
              </div>
            </div>
          }
        />
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
