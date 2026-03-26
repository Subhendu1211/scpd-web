import React from "react";
import { Outlet } from "react-router-dom";
import HeaderBar from "../components/HeaderBar/HeaderBar";
import MainNav from "../components/MainNav/Navbar";
import Footer from "../components/Footer/Footer";
import RouteFocusHandler from "../components/RouteFocusHandler";

export default function AppShell() {
  return (
    <div className="app">
      <HeaderBar />
      <MainNav />
      <RouteFocusHandler />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
