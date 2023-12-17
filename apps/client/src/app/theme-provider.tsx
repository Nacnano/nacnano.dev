"use  client";

import { siteMetaData } from "@/data/siteMetaData";
import { ThemeProvider } from "next-themes";
export function ThemeProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={siteMetaData.theme}
      enableSystem
    >
      {children}
    </ThemeProvider>
  );
}
