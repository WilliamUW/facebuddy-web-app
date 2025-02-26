import "./global.css";
import "@coinbase/onchainkit/styles.css";
import "@rainbow-me/rainbowkit/styles.css";
import Footer from "src/components/Footer";
import type { Metadata } from "next";
import { NEXT_PUBLIC_URL } from "../config";
import dynamic from "next/dynamic";
import Header from "src/components/Header";
const OnchainProviders = dynamic(
  () => import("src/components/OnchainProviders"),
  {
    ssr: false,
  }
);

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: "FaceBuddy",
  description: "Connect and Pay with 1 Click",
  openGraph: {
    title: "FaceBuddy",
    description: "Connect and Pay with 1 Click",
    images: [`${NEXT_PUBLIC_URL}/vibes/vibes-19.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex justify-center w-[800px] mx-auto my-4 bg-white">
        <OnchainProviders>
          <div className="w-full border bg-gray-100 sm:rounded-lg">
            <Header />
            {children}
            <Footer />
          </div>
        </OnchainProviders>
      </body>
    </html>
  );
}
