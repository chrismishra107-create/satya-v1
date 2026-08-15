"use client";

import { createContext, useContext, useState, useEffect } from "react";

const CategoryContext = createContext({
  activeRole: "student",
  setActiveRole: () => {},
});

export function CategoryProvider({ children }) {
  const [activeRole, setActiveRole] = useState("student");

  useEffect(() => {
    const saved = localStorage.getItem("satya_active_role");
    if (saved === "student" || saved === "business" || saved === "explore") {
      setActiveRole(saved);
    }
  }, []);

  const handleSetActiveRole = (role) => {
    setActiveRole(role);
    localStorage.setItem("satya_active_role", role);
  };

  return (
    <CategoryContext.Provider value={{ activeRole, setActiveRole: handleSetActiveRole }}>
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategory = () => useContext(CategoryContext);