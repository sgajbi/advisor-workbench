import "./globals.css";
import Link from "next/link";
import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="app-shell">
            <header className="topbar">
              <div className="topbar-inner">
                <Link href="/" className="brand">
                  Advisor Workbench
                </Link>
                <nav className="nav-links">
                  <Link href="/proposals" className="nav-link">
                    Proposal Workspace
                  </Link>
                  <Link href="/proposals/simulate" className="nav-link">
                    Simulation
                  </Link>
                  <Link href="/workbench/PF_1001" className="nav-link">
                    Workbench
                  </Link>
                </nav>
              </div>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
