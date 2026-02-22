import ProposalSimulateForm from "@/features/proposals/components/proposal-simulate-form";

export default function ProposalSimulatePage() {
  return (
    <main>
      <h1>Advisory Proposals</h1>
      <p>Run DPM proposal simulation via BFF.</p>
      <ProposalSimulateForm />
    </main>
  );
}
