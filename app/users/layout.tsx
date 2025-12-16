"use client";
import React from "react";
import Navbar from "../components/Navbar";
import { LanguageProvider } from "../context/LanguageContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <LanguageProvider>
      <div className="relative min-h-screen flex flex-col overflow-hidden text-slate-100">
        {/* Gradient background (no solid overlap) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#071426] via-[#0d203b] to-[#112e52]" />

        {/* Subtle radial glow for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,230,0,0.08),transparent_70%)] pointer-events-none" />

        {/* Navbar */}
        <Navbar />

        {/* Main content */}
        <main className="relative flex-1 z-10 p-6 md:p-10">
          {children}
        </main>
      </div>
    </LanguageProvider>
  );
};

export default Layout;
