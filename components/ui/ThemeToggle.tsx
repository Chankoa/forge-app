"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { IconButton } from "./IconButton";

const subscribe = (listener: () => void) => { window.addEventListener("forge-theme-change", listener); return () => window.removeEventListener("forge-theme-change", listener); };
const snapshot = () => document.documentElement.dataset.theme === "dark";

export function ThemeToggle() { const dark = useSyncExternalStore(subscribe, snapshot, () => false); useEffect(() => { const theme = localStorage.getItem("forge-theme"); const isDark = theme === "dark" || (theme !== "light" && snapshot()); document.documentElement.dataset.theme = isDark ? "dark" : "light"; window.dispatchEvent(new Event("forge-theme-change")); }, []); const toggle = () => { const next = !dark; localStorage.setItem("forge-theme", next ? "dark" : "light"); document.documentElement.dataset.theme = next ? "dark" : "light"; window.dispatchEvent(new Event("forge-theme-change")); }; const label = dark ? "Activer le thème clair" : "Activer le thème sombre"; return <IconButton label={label} onClick={toggle}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton>; }
