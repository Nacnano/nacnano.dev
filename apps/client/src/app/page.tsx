import { NextPage } from "next";
import React from "react";
import Main from "@/app/Main";
import { sortPosts, allCoreContent } from "pliny/utils/contentlayer";
import { allBlogs } from "contentlayer/generated";

const IndexPage: NextPage = () => {
  const sortedBlogs = sortPosts(allBlogs);
  const posts = allCoreContent(sortedBlogs);
  return <Main posts={posts} />;
};

export default IndexPage;
