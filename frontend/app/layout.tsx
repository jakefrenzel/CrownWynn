import type { Metadata } from "next";
import { Nunito_Sans } from 'next/font/google'
import { Rajdhani } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import { UIProvider } from "@/context/UIContext";
import Sidebar from "@/components/Sidebar";

// Google Font: Nunito Sans, with variable for Tailwind CSS. Display swap for better performance and user experience.
const nunitoSans = Nunito_Sans({
  variable: '--font-nunito-sans',
  subsets: ["latin"],
  display: 'swap',
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: 'swap',
});

// Metadata for the application, including title and description.
export const metadata: Metadata = {
  title: "CrownWynn",
  description: "Online Casino-Style Games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${nunitoSans.variable} ${rajdhani.variable} font-sans antialiased`}>
        <UserProvider>
          <UIProvider>
            <Sidebar />
            {children}
          </UIProvider>
        </UserProvider>
      </body>
    </html>
  );
}
