"use client";

import React, { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface HeaderProps {
  userName?: string | null;
  userEmail?: string | null;
}

export default function Header({ userName, userEmail }: HeaderProps) {
  const [dateTime, setDateTime] = useState({ day: "", date: "" });

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

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Get initials for avatar
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
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
    </header>
  );
}
