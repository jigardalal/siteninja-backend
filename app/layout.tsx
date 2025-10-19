import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SiteNinja Backend API",
  description: "Multi-tenant website builder backend API",
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
