import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tidy Team — Interactive Chore Chart",
  description: "A cheerful, shared chore chart for the whole household.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
