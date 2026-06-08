"use client";

import type { MouseEventHandler, ComponentType } from "react";

interface ActionButtonProps {
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export default function ActionButton({
  label,
  onClick,
  icon: Icon,
  className = "",
  disabled = false,
  type = "button",
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      type={type}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-lg whitespace-nowrap ${
        className ? className : "text-white"
      } ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-blue-800 cursor-pointer"
      }`}
      disabled={disabled}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {label}
    </button>
  );
}
