"use client";
import { createContext, Fragment, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ListTree, Maximize2, Minimize2, Sparkles, X } from "lucide-react";
import { expandForgeRail, toggleForgeRail, type ForgeRailState, type WorkspacePanel } from "@/lib/courses/workspace-layout";
import { IconButton } from "@/components/ui/IconButton";

const subscribe = (callback: () => void) => { const query = window.matchMedia("(max-width: 1099px)"); query.addEventListener("change", callback); return () => query.removeEventListener("change", callback); };
const snapshot = () => window.matchMedia("(max-width: 1099px)").matches;
type PanelContext = { compact: boolean; mobilePanel: WorkspacePanel | null; setMobilePanel: (panel: WorkspacePanel | null) => void; structureOpen: boolean; setStructureOpen: (open: boolean) => void; forgeState: ForgeRailState; setForgeState: (state: ForgeRailState) => void };
const Context = createContext<PanelContext | null>(null);
function usePanels() { const value = useContext(Context); if (!value) throw new Error("WorkspacePanels required"); return value; }

export function WorkspacePanels({ structure, forge, children }: { structure: ReactNode; forge: ReactNode; children: ReactNode }) {
  const compact = useSyncExternalStore(subscribe, snapshot, () => false);
  const [structureOpen, setStructureOpen] = useState(true);
  const [forgeState, setForgeState] = useState<ForgeRailState>("default");
  const [mobilePanel, setMobilePanel] = useState<WorkspacePanel | null>(null);
  const modal = compact && mobilePanel !== null;
  return <Context.Provider value={{ compact, mobilePanel, setMobilePanel, structureOpen, setStructureOpen, forgeState, setForgeState }}>
    <div className="workspace-panel-tools" aria-label="Panneaux du parcours">
      <button type="button" className="button button--secondary" aria-expanded={modal && mobilePanel === "structure"} onClick={() => setMobilePanel("structure")}><ListTree size={17} /> Structure</button>
      <button type="button" className="button button--secondary" aria-expanded={modal && mobilePanel === "forge"} onClick={() => setMobilePanel("forge")}><Sparkles size={17} /> Forge</button>
    </div>
    {modal && <button tabIndex={-1} className="workspace-scrim" aria-label="Fermer le panneau" onClick={() => setMobilePanel(null)} />}
    <div className="workspace-columns" data-structure={structureOpen ? "open" : "collapsed"} data-forge={forgeState}>
      <Fragment key="structure">{structure}</Fragment><article key="content" className="workspace-content" inert={modal}>{children}</article><Fragment key="forge">{forge}</Fragment>
    </div>
  </Context.Provider>;
}

export function WorkspaceRail({ panel, children }: { panel: WorkspacePanel; children: ReactNode }) {
  const { compact, mobilePanel, setMobilePanel, structureOpen, setStructureOpen, forgeState, setForgeState } = usePanels();
  const modal = compact && mobilePanel === panel;
  const expanded = compact ? modal : panel === "structure" ? structureOpen : forgeState !== "collapsed";
  const root = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const bodyId = useId();
  const title = panel === "structure" ? "Structure" : "Forge";
  const close = () => { if (compact) setMobilePanel(null); else if (panel === "structure") setStructureOpen(false); else setForgeState("collapsed"); };
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [modal]);
  return <aside ref={root} className={`${panel === "structure" ? "outline" : "forge"}-rail workspace-rail`} data-open={expanded} data-modal={modal} role={modal ? "dialog" : undefined} aria-modal={modal ? true : undefined} aria-label={title}
    onKeyDown={(event) => {
      if (event.target instanceof Element && event.target.closest("dialog")) return;
      if (event.key === "Escape" && expanded) { event.stopPropagation(); close(); if (!compact) toggleRef.current?.focus(); }
      if (event.key !== "Tab" || !modal) return;
      const items = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]') ?? []).filter((el) => el.getClientRects().length > 0);
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className="rail-header"><p className="rail-title">{panel === "forge" ? <Sparkles size={17} /> : <ListTree size={17} />}<span>{title}</span></p>
      <div className="rail-controls">
        {!compact && panel === "forge" && expanded && <span className="forge-expand-control"><IconButton label={forgeState === "expanded" ? "Largeur normale de Forge" : "Agrandir Forge"} aria-pressed={forgeState === "expanded"} onClick={() => setForgeState(expandForgeRail(forgeState))}>{forgeState === "expanded" ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</IconButton></span>}
        <button ref={toggleRef} type="button" className="icon-button" aria-label={compact ? `Fermer ${title}` : expanded ? `Réduire ${title}` : `Ouvrir ${title}`} title={expanded ? `Réduire ${title}` : `Ouvrir ${title}`} aria-expanded={expanded} aria-controls={bodyId} onClick={() => {
          if (compact) setMobilePanel(null); else if (panel === "structure") setStructureOpen(!structureOpen); else setForgeState(toggleForgeRail(forgeState));
        }}>{compact ? <X size={18} /> : (panel === "structure" ? expanded : !expanded) ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</button>
      </div>
    </div>
    <div id={bodyId} className="rail-body" hidden={!expanded}>{children}</div>
  </aside>;
}
