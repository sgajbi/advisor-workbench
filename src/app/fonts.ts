import localFont from "next/font/local";

const inter = localFont({
  src: "../assets/fonts/inter-variable-v4.1.woff2",
  variable: "--font-lotus-ui-face",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: "Arial",
  preload: true,
});

const cormorantGaramond = localFont({
  src: [
    {
      path: "../assets/fonts/cormorant-garamond-semibold-v4.002.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/cormorant-garamond-bold-v4.002.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-lotus-display-face",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
  preload: true,
});

const ibmPlexMono = localFont({
  src: [
    {
      path: "../assets/fonts/ibm-plex-mono-regular-v6.4.2.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/ibm-plex-mono-medium-v6.4.2.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-lotus-mono-face",
  display: "swap",
  fallback: ["Consolas", "monospace"],
  adjustFontFallback: false,
  preload: true,
});

export const lotusFontVariableClassNames = [
  inter.variable,
  cormorantGaramond.variable,
  ibmPlexMono.variable,
].join(" ");
