import { NextPage } from "next";
import { LandingPage } from "@/modules/LandingPage";
import React from "react";
import Main from "./Main";

const IndexPage: NextPage = () => {
  const posts = [];
  return <Main posts={posts} />;
};

export default IndexPage;
