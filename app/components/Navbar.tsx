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

          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex items-center text-slate-100 hover:text-yellow-300 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border border-white/10"
            >
              {language === "en" ? "English" : "Tagalog"}
              <svg
                className={`ml-1 h-4 w-4 transition-transform duration-200 ${
                  isLanguageDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isLanguageDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-[#0d203b]/95 border border-white/10 rounded-lg shadow-lg backdrop-blur-md overflow-hidden z-50">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code as "en" | "tl");
                      setIsLanguageDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-all duration-200 ${
                      language === lang.code
                        ? "bg-yellow-400 text-blue-900 font-semibold"
                        : "text-slate-100 hover:bg-white/10 hover:text-yellow-300"
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
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
