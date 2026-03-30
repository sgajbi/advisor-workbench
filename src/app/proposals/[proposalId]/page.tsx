import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    proposalId: string;
  }>;
};

export default async function ProposalDetailPage({ params }: Props) {
  await params;
  redirect("/portfolio");
}
