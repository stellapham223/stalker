"use client";
import { useState } from "react";

export function TabButton({ tracking, isActive, onClick, onDelete, badge }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      className={`relative px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
        isActive
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {tracking.name}
      {badge > 0 && (
        <span className="ml-1 rounded-full bg-badge-notification px-1 py-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
          {badge}
        </span>
      )}
      {hovered && (
        <button
          aria-label="Remove tab"
          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          x
        </button>
      )}
    </button>
  );
}
