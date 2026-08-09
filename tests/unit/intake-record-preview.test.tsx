import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  INTAKE_PREVIEW_PAGE_SIZE,
  IntakeRecordPreview,
} from "@/features/intake/components/intake-record-preview";
import type { IntakeReviewPreviewSection } from "@/features/intake/draft";

describe("IntakeRecordPreview", () => {
  it.each([
    INTAKE_PREVIEW_PAGE_SIZE - 1,
    INTAKE_PREVIEW_PAGE_SIZE,
    INTAKE_PREVIEW_PAGE_SIZE + 1,
  ])("bounds display work for %i records", async (recordCount) => {
    const section = previewSection("Transaction records", recordCount);
    render(<IntakeRecordPreview sections={[section]} />);

    expect(section.recordAt).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId("intake-preview-record")).toHaveLength(0);

    fireEvent.click(screen.getByText("Transaction records"));

    const firstPageCount = Math.min(recordCount, INTAKE_PREVIEW_PAGE_SIZE);
    await waitFor(() => {
      expect(screen.getAllByTestId("intake-preview-record")).toHaveLength(firstPageCount);
    });
    expect(section.recordAt).toHaveBeenCalledTimes(firstPageCount);
    expect(screen.getByText(`Records 1–${firstPageCount} of ${recordCount}`)).toBeInTheDocument();
    expect(screen.getByText(`Page 1 of ${recordCount > INTAKE_PREVIEW_PAGE_SIZE ? 2 : 1}`)).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Previous transaction records" })).toBeDisabled();

    const next = screen.getByRole("button", { name: "Next transaction records" });
    if (recordCount <= INTAKE_PREVIEW_PAGE_SIZE) {
      expect(next).toBeDisabled();
      return;
    }

    fireEvent.click(next);
    expect(await screen.findByRole("heading", { name: `Transaction record ${recordCount}` })).toBeInTheDocument();
    expect(screen.getAllByTestId("intake-preview-record")).toHaveLength(1);
    expect(screen.getByText(`Records ${recordCount}–${recordCount} of ${recordCount}`)).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toHaveAttribute("aria-current", "page");
    expect(next).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous transaction records" })).toBeEnabled();
    expect(section.recordAt).toHaveBeenCalledTimes(recordCount);
  });

  it("returns the record pane to its first row when paging", async () => {
    const section = previewSection("Transaction records", 11);
    render(<IntakeRecordPreview sections={[section]} />);
    fireEvent.click(screen.getByText("Transaction records"));

    await screen.findByRole("heading", { name: "Transaction record 1" });
    const next = screen.getByRole("button", { name: "Next transaction records" });
    const recordPane = document.getElementById(next.getAttribute("aria-controls") ?? "");
    if (!recordPane) throw new Error("Expected a scrollable transaction record pane");
    recordPane.scrollTop = 120;

    fireEvent.click(next);

    expect(await screen.findByRole("heading", { name: "Transaction record 11" })).toBeInTheDocument();
    expect(recordPane.scrollTop).toBe(0);
  });

  it("keeps page posture independent for each record family", async () => {
    const transactionSection = previewSection("Transaction records", 11);
    const priceSection = previewSection("Price observation records", 11);
    render(<IntakeRecordPreview sections={[transactionSection, priceSection]} />);

    const transactionDetails = detailsFor("Transaction records");
    const priceDetails = detailsFor("Price observation records");
    fireEvent.click(within(transactionDetails).getByText("Transaction records"));
    await waitFor(() => {
      expect(within(transactionDetails).getAllByTestId("intake-preview-record")).toHaveLength(10);
    });
    fireEvent.click(within(transactionDetails).getByRole("button", { name: "Next transaction records" }));
    expect(await within(transactionDetails).findByText("Page 2 of 2")).toBeInTheDocument();

    fireEvent.click(within(priceDetails).getByText("Price observation records"));
    expect(await within(priceDetails).findByText("Page 1 of 2")).toBeInTheDocument();
    expect(within(transactionDetails).getByText("Page 2 of 2")).toBeInTheDocument();
    expect(within(priceDetails).getByText("Records 1–10 of 11")).toBeInTheDocument();
    expect(within(transactionDetails).getByText("Records 11–11 of 11")).toBeInTheDocument();
  });

  it("unmounts projected records when a family is closed", async () => {
    const section = previewSection("Portfolio records", 3);
    render(<IntakeRecordPreview sections={[section]} />);
    const summary = screen.getByText("Portfolio records");

    fireEvent.click(summary);
    await waitFor(() => expect(screen.getAllByTestId("intake-preview-record")).toHaveLength(3));
    fireEvent.click(summary);
    await waitFor(() => expect(screen.queryAllByTestId("intake-preview-record")).toHaveLength(0));
  });
});

function previewSection(title: string, recordCount: number): IntakeReviewPreviewSection & {
  recordAt: ReturnType<typeof vi.fn<IntakeReviewPreviewSection["recordAt"]>>;
} {
  return {
    title,
    recordCount,
    recordAt: vi.fn((index: number) =>
      index >= 0 && index < recordCount
        ? {
            title: `${title.slice(0, -1)} ${index + 1}`,
            facts: [{ label: "Source order", value: String(index + 1) }],
          }
        : null,
    ),
  };
}

function detailsFor(sectionTitle: string): HTMLElement {
  const details = screen.getByText(sectionTitle).closest("details");
  if (!details) throw new Error(`Expected details for ${sectionTitle}`);
  return details;
}
