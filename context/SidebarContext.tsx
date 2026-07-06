"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

interface IScrollY {
  id: string | null;
  position: number;
}

interface ISidebarContext {
  isSidebarOpen: boolean;
  scrollY: IScrollY;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  saveScroll: (el: HTMLElement | null) => void;
}

const defaultContextValue: ISidebarContext = {
  isSidebarOpen: false,
  scrollY: { id: null, position: 0 },
  closeSidebar: () => {},
  toggleSidebar: () => {},
  saveScroll: () => {},
};

const SidebarContext =
  React.createContext<ISidebarContext>(defaultContextValue);

interface ISidebarProviderProps {
  children: React.ReactNode;
}

export const SidebarProvider = ({ children }: ISidebarProviderProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const defaultScrollY = useMemo<IScrollY>(() => {
    return { id: null, position: 0 };
  }, []);

  const storageScrollY = useCallback((): IScrollY => {
    if (typeof window === "undefined") {
      return defaultScrollY;
    }

    try {
      const stored = localStorage.getItem("sidebarScrollY");
      return stored ? JSON.parse(stored) : defaultScrollY;
    } catch {
      return defaultScrollY;
    }
  }, [defaultScrollY]);

  const [scrollY, setScrollY] = useState<IScrollY>(() => {
    if (typeof window === "undefined") {
      return defaultScrollY;
    }
    return storageScrollY();
  });

  function toggleSidebar() {
    setIsSidebarOpen((prev) => !prev);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function saveScroll(el: HTMLElement | null) {
    const id = el?.id || null;
    const position = el?.scrollTop || 0;
    setScrollY({ id, position });
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarScrollY", JSON.stringify(scrollY));
    }
  }, [scrollY]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const { id, position } = storageScrollY();

    if (!id) return;

    const element = document.getElementById(id);
    if (!element) return;

    element.scrollTo(0, position);

    if (isSidebarOpen) {
      element.scrollTo(0, position);
    }
  }, [scrollY, storageScrollY, isSidebarOpen]);

  const contextValue = useMemo(
    () => ({
      isSidebarOpen,
      scrollY,
      toggleSidebar,
      closeSidebar,
      saveScroll,
    }),
    [isSidebarOpen, scrollY],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarContext;
