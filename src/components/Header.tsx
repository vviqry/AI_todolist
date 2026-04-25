"use client";

import React, { useEffect, useState, useRef } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface HeaderProps {
  userName?: string | null;
  userEmail?: string | null;
}

export default function Header({ userName, userEmail }: HeaderProps) {
  const [dateTime, setDateTime] = useState({ day: "", date: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const updateTime = () => {
      const now = new Date();
      setDateTime({
        day: days[now.getDay()],
        date: `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const displayName = userName || userEmail || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="header">
      <div className="profile-section">
        <div className="avatar">
          <span style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.5px" }}>
            {initials}
          </span>
        </div>
        <div className="profile-info">
          <h1 className="user-name">{displayName}</h1>
          <p className="user-role">{userEmail || ""}</p>
        </div>
      </div>
      
      {/* Desktop view controls */}
      <div className="header-controls-desktop">
        <div className="time-section">
          <p className="current-day">{dateTime.day}</p>
          <p className="current-date">{dateTime.date}</p>
        </div>
        <button
          onClick={handleLogout}
          className="delete-btn"
          title="Logout"
          style={{ marginTop: "2px" }}
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Mobile view hamburger */}
      <div className="header-controls-mobile" ref={menuRef}>
        <button 
          className="hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        {menuOpen && (
          <div className="mobile-dropdown">
            <div className="dropdown-time">
              <p className="current-day">{dateTime.day}</p>
              <p className="current-date">{dateTime.date}</p>
            </div>
            <button
              onClick={handleLogout}
              className="dropdown-logout-btn"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
