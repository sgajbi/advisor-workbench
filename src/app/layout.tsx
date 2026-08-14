import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import Providers from "./providers";
import AppShell from "@/shell/app-shell";
import { lotusFontVariableClassNames } from "./fonts";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={lotusFontVariableClassNames}
      data-font-delivery="self-hosted"
      lang="en"
    >
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
