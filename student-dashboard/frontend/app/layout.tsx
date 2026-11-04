import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northgate — Student Management",
  description: "Students, courses, grades and attendance for Northgate School.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
