'use client';

// ─────────────────────────────────────────────────────────────────────────────
// context/ProfilePanelContext.tsx
//
// Minimal context that lets the Sidebar username card open the ProfilePanel
// without prop-drilling through the layout tree.
//
// Usage:
//   1. Wrap layout in <ProfilePanelProvider>
//   2. Sidebar calls openPanel()
//   3. Dashboard pages render <ProfilePanel /> (reads open state from context)
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ProfilePanelCtx {
  open:       boolean;
  openPanel:  () => void;
  closePanel: () => void;
}

const Ctx = createContext<ProfilePanelCtx>({
  open:       false,
  openPanel:  () => {},
  closePanel: () => {},
});

export function ProfilePanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, openPanel: () => setOpen(true), closePanel: () => setOpen(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useProfilePanel = () => useContext(Ctx);