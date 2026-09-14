import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

function SectionContainer({ children }: Props) {
  return <div className="mx-auto max-w-3xl px-5 sm:px-8">{children}</div>;
}

export default SectionContainer;
