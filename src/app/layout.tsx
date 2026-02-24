import "./globals.css";
import Link from "next/link";
import Providers from "./providers";
import TopNav from "./top-nav";

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
                <TopNav />
              </div>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
