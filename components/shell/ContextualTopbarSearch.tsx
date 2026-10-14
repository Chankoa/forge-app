"use client";

import { Search } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

type SearchConfig = {
  id: string;
  placeholder: string;
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
};

type SearchContextValue = {
  search: SearchConfig | null;
  setSearch: Dispatch<SetStateAction<SearchConfig | null>>;
};

const ContextualTopbarSearchContext = createContext<SearchContextValue | null>(null);

export function ContextualTopbarSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState<SearchConfig | null>(null);
  const value = useMemo(() => ({ search, setSearch }), [search]);
  return <ContextualTopbarSearchContext.Provider value={value}>{children}</ContextualTopbarSearchContext.Provider>;
}

export function useContextualTopbarSearch(config: SearchConfig) {
  const context = useContext(ContextualTopbarSearchContext);
  const setSearch = context?.setSearch;
  useEffect(() => {
    if (!setSearch) return;
    setSearch(config);
    return () => setSearch((current) => current?.id === config.id ? null : current);
  }, [config, setSearch]);
}

export function useContextualTopbarSearchState() {
  const context = useContext(ContextualTopbarSearchContext);
  return context?.search ?? null;
}

export function ContextualTopbarSearch() {
  const search = useContextualTopbarSearchState();
  if (!search) return null;
  return <label className="contextual-topbar-search">
    <Search size={17} aria-hidden="true" />
    <span className="sr-only">{search.placeholder}</span>
    <input type="search" value={search.value} onChange={(event) => search.onChange(event.target.value)} placeholder={search.placeholder} />
  </label>;
}
