"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const menuItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      label: "Dashboard Overview",
      href: "/admin/dashboard",
    },

    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
      label: "Inquiry Logs",
      href: "/admin/dashboard/inquiry",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
      ),
      label: "Feedback Summary",
      href: "/admin/dashboard/feedback",
    },

    {
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
      ),
      label: "Chatbot System",
      href: "/admin/dashboard/chatbot",
    },

    {
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
      label: "Upload Handbook",
      href: "/admin/dashboard/upload",
    },
  ];

  const handleLogout = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/");
    }, 1500);
  };

  return (
    <div className="w-64 h-screen fixed left-0 top-0 bg-gradient-to-b from-[#0d1b2a] via-[#0a2342] to-[#001e3c] text-blue-100 flex flex-col border-r border-blue-800/40 backdrop-blur-xl shadow-[0_0_25px_rgba(0,0,0,0.3)]">
      
      {/* Header */}
      <div className="p-6 border-b border-blue-800/40 bg-white/5 backdrop-blur-lg">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="STI Logo"
            className="w-12 h-12 object-contain rounded-lg shadow-lg"
          />
          <div>
            <h1 className="font-bold text-lg text-white">STI Admin</h1>
            <p className="text-blue-300 text-sm tracking-wide">
              Tagaytay AI Chatbot
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto custom-scroll">
        <ul className="space-y-2 px-4">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <li key={index}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-blue-700/60 to-blue-500/60 shadow-md border-l-4 border-yellow-400"
                      : "hover:bg-blue-900/30"
                  }`}
                >
                  <span
                    className={`${
                      isActive ? "text-yellow-400" : "text-blue-300 group-hover:text-white"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`font-medium ${
                      isActive ? "text-white" : "text-blue-100 group-hover:text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-blue-800/40 bg-white/5">
        <button
          onClick={handleLogout}
          disabled={loading}
          className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all duration-200 ${
            loading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-900/30 border border-blue-700 hover:bg-blue-800/40"
          }`}
        >
          {loading ? (
            <span className="text-white font-medium animate-pulse">Logging out...</span>
          ) : (
            <>
              <svg
                className="w-5 h-5 text-blue-300 group-hover:text-white transition-colors duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium text-blue-100 group-hover:text-white">Log out</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
