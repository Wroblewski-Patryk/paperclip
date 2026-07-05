import { createContext, useCallback, useContext, useMemo, useState, useEffect, type ReactNode } from "react";

export interface SidebarContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
  collapsed: boolean;
  collapseLocked: boolean;
  peeking: boolean;
  routeRequestsCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  setForceCollapsed: (collapsed: boolean) => void;
  setPeeking: (peeking: boolean) => void;
  setRouteRequestsCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const MOBILE_BREAKPOINT = 768;
const COLLAPSED_STORAGE_KEY = "paperclip.sidebar.collapsed";

function readCollapsedPin(): boolean | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= MOBILE_BREAKPOINT);
  const [collapsedPin, setCollapsedPin] = useState<boolean | null>(() => readCollapsedPin());
  const [routeRequestsCollapsed, setRouteRequestsCollapsed] = useState(false);
  const [forceCollapsed, setForceCollapsedState] = useState(false);
  const [peekingRequested, setPeekingRequested] = useState(false);
  const [hoverFine, setHoverFine] = useState(() =>
    typeof window.matchMedia === "function" ? window.matchMedia("(hover: hover)").matches : true
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setSidebarOpen(!e.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(hover: hover)");
    const onChange = (e: MediaQueryListEvent) => setHoverFine(e.matches);
    setHoverFine(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const collapseLocked = forceCollapsed && !isMobile;
  const collapsed = isMobile
    ? false
    : collapseLocked
      ? true
      : collapsedPin ?? routeRequestsCollapsed;
  const peeking = !isMobile && hoverFine && collapsed && peekingRequested;

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedPin(next);
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
  }, []);

  const toggleCollapsed = useCallback(() => {
    if (collapseLocked) return;
    setCollapsed(!collapsed);
  }, [collapseLocked, collapsed, setCollapsed]);

  const setForceCollapsed = useCallback((next: boolean) => {
    setForceCollapsedState(next);
  }, []);

  const setPeeking = useCallback((next: boolean) => {
    setPeekingRequested(next);
  }, []);

  const value = useMemo(() => ({
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    isMobile,
    collapsed,
    collapseLocked,
    peeking,
    routeRequestsCollapsed,
    setCollapsed,
    toggleCollapsed,
    setForceCollapsed,
    setPeeking,
    setRouteRequestsCollapsed,
  }), [
    sidebarOpen,
    toggleSidebar,
    isMobile,
    collapsed,
    collapseLocked,
    peeking,
    routeRequestsCollapsed,
    setCollapsed,
    toggleCollapsed,
    setForceCollapsed,
    setPeeking,
  ]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
