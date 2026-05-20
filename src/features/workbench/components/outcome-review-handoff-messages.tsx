"use client";

import { Text } from "@/design-system";

type Props = {
  messages: string[];
};

export default function OutcomeReviewHandoffMessages({ messages }: Props) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="outcome-review-handoff-messages" aria-label="Outcome review handoff status">
      {messages.map((message) => (
        <Text key={message} variant="secondary" className="muted">
          {message}
        </Text>
      ))}
    </div>
  );
}
