import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pawsome Care Davis",
  description: "Home-based pet care in Davis, California with booking, gallery, services, and a pet parent portal demo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
