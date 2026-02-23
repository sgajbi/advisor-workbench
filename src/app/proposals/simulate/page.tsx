import Link from "next/link";

import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";

export default function ProposalSimulatePage() {
  return (
    <main className="page-container">
      <h1 className="page-title">Advisory Proposals</h1>
      <p className="page-subtitle">Run DPM proposal simulation via BFF.</p>
      <p>
        <Link href="/proposals">Go to Proposal Workspace</Link>
      </p>
      <ProposalSimulateForm />
    </main>
  );
}
