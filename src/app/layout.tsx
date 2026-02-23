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
                  Wealth Operations
                </Link>
                <nav className="nav-links">
                  <Link href="/suite" className="nav-link">
                    Command Center
                  </Link>
                  <Link href="/pas/intake" className="nav-link">
                    Portfolio Intake
                  </Link>
                  <Link href="/pa/analytics" className="nav-link">
                    Analytics Studio
                  </Link>
                  <Link href="/proposals" className="nav-link">
                    Advisory Pipeline
                  </Link>
                  <Link href="/proposals/simulate" className="nav-link">
                    Scenario Builder
                  </Link>
                  <Link href="/workbench/PF_1001" className="nav-link">
                    Decision Console
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
