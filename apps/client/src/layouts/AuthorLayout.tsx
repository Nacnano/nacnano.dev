import React from "react";
import { Authors } from "contentlayer/generated";
import Image from "next/image";

interface Props {
  children: React.ReactNode;
  content: Omit<Authors, "_id" | "_raw" | "body">;
}

export default function AuthorLayout({ children, content }: Props) {
  const { name, occupation, company, github, email, avatar } = content;
  return (
    <>
      <div>
        <div>
          <h1> Author</h1>
        </div>
        <div>
          <div>
            {avatar && <div>AVATAR PICTURE</div>}
            <h3>{name}</h3>
            <div>{occupation}</div>
            <div> {company}</div>
            <div>
              <a>email</a>
              <a>github</a>
            </div>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </>
  );
}
