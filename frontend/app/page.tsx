import { redirect } from "next/navigation";
import React from "react";

const Home = () => {
  return redirect("/chat");
};

export default Home;