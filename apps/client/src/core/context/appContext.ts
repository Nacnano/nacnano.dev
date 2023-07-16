import { createContext, useContext } from "react";

export type themeOptions = "default" | "light" | "dark";

interface IAppContext {
  theme: themeOptions;
  handleTheme: (newTheme: themeOptions) => void;
}

export const AppContext = createContext<IAppContext>({
  theme: "default",
  handleTheme: () => null,
});

export function useAppContext() {
  return useContext(AppContext);
}
