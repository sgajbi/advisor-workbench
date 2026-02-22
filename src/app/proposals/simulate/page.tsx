import Link from "next/link";

import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";

export default function ProposalSimulatePage() {
  return (
    <main style={{ padding: "1rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1>Advisory Proposals</h1>
      <p>Run DPM proposal simulation via BFF.</p>
      <p>
        <Link href="/proposals">Go to Proposal Workspace</Link>
      </p>
      <ProposalSimulateForm />
    </main>
  );
}
