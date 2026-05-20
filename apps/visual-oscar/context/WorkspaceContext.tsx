"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type { AgentContextItem, WorkspaceTab } from "@/types/workspace";

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  isAgentOpen: boolean;
  isCommandPaletteOpen: boolean;
  contextItems: AgentContextItem[];
}

type WorkspaceAction =
  | { type: "OPEN_TAB"; tab: WorkspaceTab }
  | { type: "CLOSE_TAB"; tabId: string }
  | { type: "SET_ACTIVE_TAB"; tabId: string }
  | { type: "TOGGLE_AGENT" }
  | { type: "OPEN_COMMAND_PALETTE" }
  | { type: "CLOSE_COMMAND_PALETTE" }
  | { type: "SET_CONTEXT_ITEMS"; items: AgentContextItem[] };

function reducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "OPEN_TAB": {
      const exists = state.tabs.find(t => t.id === action.tab.id);
      if (exists) return { ...state, activeTabId: action.tab.id };
      return { ...state, tabs: [...state.tabs, action.tab], activeTabId: action.tab.id };
    }
    case "CLOSE_TAB": {
      const filtered = state.tabs.filter(t => t.id !== action.tabId);
      const nextActive =
        state.activeTabId === action.tabId
          ? (filtered[filtered.length - 1]?.id ?? null)
          : state.activeTabId;
      return { ...state, tabs: filtered, activeTabId: nextActive };
    }
    case "SET_ACTIVE_TAB":
      return { ...state, activeTabId: action.tabId };
    case "TOGGLE_AGENT":
      return { ...state, isAgentOpen: !state.isAgentOpen };
    case "OPEN_COMMAND_PALETTE":
      return { ...state, isCommandPaletteOpen: true };
    case "CLOSE_COMMAND_PALETTE":
      return { ...state, isCommandPaletteOpen: false };
    case "SET_CONTEXT_ITEMS":
      return { ...state, contextItems: action.items };
    default:
      return state;
  }
}

interface WorkspaceContextValue extends WorkspaceState {
  openTab: (tab: WorkspaceTab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  toggleAgent: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setContextItems: (items: AgentContextItem[]) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const INITIAL: WorkspaceState = {
  tabs: [],
  activeTabId: null,
  isAgentOpen: true,
  isCommandPaletteOpen: false,
  contextItems: [],
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const openTab           = useCallback((tab: WorkspaceTab) => dispatch({ type: "OPEN_TAB", tab }), []);
  const closeTab          = useCallback((tabId: string) => dispatch({ type: "CLOSE_TAB", tabId }), []);
  const setActiveTab      = useCallback((tabId: string) => dispatch({ type: "SET_ACTIVE_TAB", tabId }), []);
  const toggleAgent       = useCallback(() => dispatch({ type: "TOGGLE_AGENT" }), []);
  const openCommandPalette  = useCallback(() => dispatch({ type: "OPEN_COMMAND_PALETTE" }), []);
  const closeCommandPalette = useCallback(() => dispatch({ type: "CLOSE_COMMAND_PALETTE" }), []);
  const setContextItems   = useCallback((items: AgentContextItem[]) => dispatch({ type: "SET_CONTEXT_ITEMS", items }), []);

  return (
 <WorkspaceContext.Provider
      value={{ ...state, openTab, closeTab, setActiveTab, toggleAgent, openCommandPalette, closeCommandPalette, setContextItems }}
    >
      {children}
 </WorkspaceContext.Provider>
  );
}

export function useWorkspaceStore() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceStore must be inside WorkspaceProvider");
  return ctx;
}
