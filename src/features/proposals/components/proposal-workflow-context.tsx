"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Panel, SemanticBadge, Text } from "@/design-system";
import type { ProposalWorkflowContextModel } from "../proposal-workflow-context-view-model";
import styles from "./proposal-workspace-shell.module.css";

type ProposalWorkflowContextValue = {
  model: ProposalWorkflowContextModel;
  publish: (model: ProposalWorkflowContextModel) => void;
  reset: () => void;
};

const ProposalWorkflowContext = createContext<ProposalWorkflowContextValue | null>(null);

export function ProposalWorkflowContextProvider({
  initialModel,
  children,
}: {
  initialModel: ProposalWorkflowContextModel;
  children: ReactNode;
}) {
  const [model, setModel] = useState(initialModel);
  const publish = useCallback((nextModel: ProposalWorkflowContextModel) => setModel(nextModel), []);
  const reset = useCallback(() => setModel(initialModel), [initialModel]);
  const value = useMemo(() => ({ model, publish, reset }), [model, publish, reset]);

  return (
    <ProposalWorkflowContext.Provider value={value}>{children}</ProposalWorkflowContext.Provider>
  );
}

export function ProposalWorkflowContextPublisher({
  model,
}: {
  model: ProposalWorkflowContextModel;
}) {
  const { publish, reset } = useProposalWorkflowContext();

  useEffect(() => {
    publish(model);
  }, [model, publish]);

  useEffect(() => reset, [reset]);

  return null;
}

export function usePublishProposalWorkflowContext(model: ProposalWorkflowContextModel): void {
  const context = useContext(ProposalWorkflowContext);
  const publish = context?.publish;
  const reset = context?.reset;

  useEffect(() => {
    if (!publish) return;
    publish(model);
  }, [model, publish]);

  useEffect(() => {
    if (!reset) return;
    return reset;
  }, [reset]);
}

function useProposalWorkflowContext(): ProposalWorkflowContextValue {
  const context = useContext(ProposalWorkflowContext);
  if (!context) {
    throw new Error("Proposal workflow context must be used within its provider.");
  }
  return context;
}

export function ProposalWorkflowContextRail() {
  const { model } = useProposalWorkflowContext();
  const isSupplementary = model.responsivePriority === "supplementary";

  return (
    <div
      className={`${styles.proposalSide} ${isSupplementary ? styles.supplementaryContext : ""}`}
      data-responsive-priority={model.responsivePriority}
    >
      <Panel className={`${styles.contextPanel} ${styles.workflowContextPanel}`}>
        <div className={styles.drawerHeader}>
          <div>
            <Text variant="microLabel">Workflow context</Text>
            <Text variant="subsectionTitle" as="h2">
              {model.title}
            </Text>
          </div>
          <SemanticBadge tone={model.stateTone}>{model.stateLabel}</SemanticBadge>
        </div>

        <p className={styles.workflowSummary} role="status" aria-live="polite">
          {model.summary}
        </p>

        <dl className={styles.workflowFacts} aria-label="Advisory workflow summary">
          {model.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>

        <section className={styles.decisionBlock} aria-labelledby="workflow-current-posture">
          <Text variant="microLabel" id="workflow-current-posture">
            Current posture
          </Text>
          <strong>{model.currentPosture}</strong>
        </section>

        <section className={styles.decisionBlock} aria-labelledby="workflow-next-action">
          <Text variant="microLabel" id="workflow-next-action">
            Next business action
          </Text>
          <strong>{model.nextAction}</strong>
        </section>

        {model.blockers.length > 0 ? (
          <section className={styles.blockerBlock} aria-labelledby="workflow-blockers">
            <Text variant="microLabel" id="workflow-blockers">
              Attention required
            </Text>
            <ul>
              {model.blockers.map((blocker, index) => (
                <li key={`${blocker}:${index}`}>{blocker}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </Panel>

      <ProposalWorkflowBoundary model={model} />
    </div>
  );
}

export function ProposalWorkflowContextBoundary({
  presentation = "rail",
}: {
  presentation?: "rail" | "inline";
}) {
  const { model } = useProposalWorkflowContext();

  return <ProposalWorkflowBoundary model={model} presentation={presentation} />;
}

export function ProposalWorkflowBoundary({
  model,
  presentation = "rail",
}: {
  model: ProposalWorkflowContextModel;
  presentation?: "rail" | "inline";
}) {
  return (
    <Panel
      className={`${styles.contextPanel} ${styles.sourceBoundaryPanel} ${
        presentation === "inline" ? styles.inlineSourceBoundary : ""
      }`}
      data-context-presentation={presentation}
    >
      <div>
        <Text variant="microLabel">Source and scope</Text>
        <strong>{model.sourceLabel}</strong>
      </div>
      <p>{model.boundaryNote}</p>
    </Panel>
  );
}
