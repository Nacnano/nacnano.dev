import { NextPage } from "next";
import { LandingPage } from "@/modules/LandingPage";
import { NavigationBar } from "@/layouts/NavigationBar";
import React from "react";

const IndexPage: NextPage = () => {
  return (
    <>
      <NavigationBar />
      <LandingPage />
    </>
  );
};

export default IndexPage;
