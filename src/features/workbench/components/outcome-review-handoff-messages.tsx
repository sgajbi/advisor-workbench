"use client";

import { Text } from "@/design-system";
import styles from "./outcome-review.module.css";

type Props = {
  messages: string[];
};

export default function OutcomeReviewHandoffMessages({ messages }: Props) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={styles.handoffMessages} aria-label="Outcome review handoff status">
      {messages.map((message) => (
        <Text key={message} variant="secondary" className="muted">
          {message}
        </Text>
      ))}
    </div>
  );
}
