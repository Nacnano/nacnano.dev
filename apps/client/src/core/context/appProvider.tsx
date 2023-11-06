"use client";
import { FC, PropsWithChildren, useEffect, useState } from "react";
import { AppContext, themeOptions } from "./appContext";
import React from "react";

export const AppProvider: FC<PropsWithChildren> = ({ children }) => {
  const [theme, setTheme] = useState<themeOptions>("default");

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme) {
      setTheme(theme as themeOptions);
    }
  }, []);

  const handleTheme = (newTheme: themeOptions) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };
  return (
    <AppContext.Provider value={{ theme, handleTheme }}>
      {children}
    </AppContext.Provider>
  );
};
