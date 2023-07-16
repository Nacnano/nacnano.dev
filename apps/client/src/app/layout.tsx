import { Metadata } from "next";
import { AppProvider } from "../core/context/appProvider";

export const metadata: Metadata = {
  title: "Nacnano",
  description: "Nacnano's Personal Website",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <AppProvider>
        <body>{children}</body>
      </AppProvider>
    </html>
  );
}
