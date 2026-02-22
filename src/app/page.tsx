import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Advisor Workbench</h1>
      <ul>
        <li>
          <Link href="/proposals">Proposal workspace</Link>
        </li>
        <li>
          <Link href="/proposals/simulate">Proposal simulation</Link>
        </li>
        <li>Legacy workbench stub: /workbench/PF_1001</li>
      </ul>
    </main>
  );
}
