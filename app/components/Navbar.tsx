"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";

const Navbar = () => {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const { language, changeLanguage } = useLanguage();

  const navItems = [
    {
      name: language === "en" ? "Enrollment" : "Pag-enroll",
      href: "https://www.sti.edu/campuses-details.asp?campus_id=VEdZ",
      external: true,
    },
    {
      name: language === "en" ? "About" : "Tungkol",
      href: "/users/about",
      external: false,
    },
    {
      name: language === "en" ? "Contact Us" : "Makipag-ugnayan",
      href: "https://www.facebook.com/tagaytay.sti.edu",
      external: true,
    },
  ];

  const languages = [
    { code: "en", name: "English" },
    { code: "tl", name: "Tagalog" },
  ];

  return (
    <nav className="relative z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img
              src="/logo.png"
              alt="STI Logo"
              className="h-10 w-auto transition-transform duration-300 hover:scale-105"
            />
            <span className="text-yellow-300 font-semibold text-lg hidden sm:block">
              STI Tagaytay
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-100 hover:text-yellow-300 transition-colors duration-300 relative group"
                >
                  {item.name}
                  <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                </a>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-slate-100 hover:text-yellow-300 transition-colors duration-300 relative group"
                >
                  {item.name}
                  <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-yellow-400 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              )
            )}
          </div>


          {/* Mobile menu button (future use) */}
          <div className="md:hidden">
            <button className="text-slate-100 hover:text-yellow-300 p-2 rounded-md transition-colors duration-300">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isLanguageDropdownOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsLanguageDropdownOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
