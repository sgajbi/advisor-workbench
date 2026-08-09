import { SectionBlock } from "@/design-system";

import { INTAKE_TASKS, type IntakeTask } from "../draft";
import styles from "../intake-workspace.module.css";

export function IntakeTaskSelector({ onSelect }: { onSelect: (task: IntakeTask) => void }) {
  return (
    <SectionBlock
      title="Start an intake request"
      subtitle="Choose one bounded portfolio-administration action. Each request is validated and reviewed independently."
    >
      <div className={styles.taskGrid} role="list" aria-label="Available intake requests">
        {INTAKE_TASKS.map((task) => (
          <div key={task.task} role="listitem">
            <button
              type="button"
              className={styles.taskCard}
              onClick={() => onSelect(task.task)}
            >
              <span className={styles.taskAudience}>{task.audience}</span>
              <strong className={styles.taskTitle}>{task.title}</strong>
              <span className={styles.taskDescription}>{task.description}</span>
              <span className={styles.taskAction}>Prepare request</span>
            </button>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}
