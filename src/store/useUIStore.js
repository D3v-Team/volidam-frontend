import { create } from "zustand";

export const useUIStore = create((set) => ({
    collapsed: localStorage.getItem("collapsed") === "true" ? true : false,
    toggleSidebar: () =>
        set((state) => {
            const next = !state.collapsed;
            localStorage.setItem("collapsed", next);
            return {collapsed : next}
        }),
}));
