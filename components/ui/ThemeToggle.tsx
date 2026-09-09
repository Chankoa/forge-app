"use client";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "./IconButton";
export function ThemeToggle() { const toggle = () => { const dark = document.documentElement.dataset.theme === "dark"; const next = !dark; localStorage.setItem("forge-theme", next ? "dark" : "light"); document.documentElement.dataset.theme = next ? "dark" : "light"; }; return <IconButton label="Changer de thème" onClick={toggle}><Sun size={16} /><Moon size={16} /></IconButton>; }