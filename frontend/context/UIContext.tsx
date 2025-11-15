"use client";

import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";

type UIContextValue = {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  firstTimeVisible: boolean;
  hideFirstTime: () => void;
  showFirstTime: () => void;
  scrollOffset: number;
  setScrollOffset: (offset: number) => void;
};

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [firstTimeVisible, setFirstTimeVisible] = useState(true);
  const [scrollOffset, setScrollOffsetState] = useState(0);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);
  const hideFirstTime = useCallback(() => setFirstTimeVisible(false), []);
  const showFirstTime = useCallback(() => setFirstTimeVisible(true), []);
  const setScrollOffset = useCallback((offset: number) => setScrollOffsetState(offset), []);

  const value = useMemo(() => ({ 
    menuOpen, 
    openMenu, 
    closeMenu, 
    toggleMenu,
    firstTimeVisible,
    hideFirstTime,
    showFirstTime,
    scrollOffset,
    setScrollOffset
  }), [menuOpen, openMenu, closeMenu, toggleMenu, firstTimeVisible, hideFirstTime, showFirstTime, scrollOffset, setScrollOffset]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a UIProvider");
  return ctx;
}
