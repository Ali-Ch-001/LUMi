import { Outlet } from "react-router-dom";
import Topbar from "@/components/shared/Topbar";
import Bottombar from "@/components/shared/Bottombar";
import LeftSidebar from "@/components/shared/LeftSidebar";

const RootLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <LeftSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <section className="flex flex-1 overflow-auto p-4">
          <Outlet />
        </section>
        <Bottombar />
      </div>
    </div>
  );
};

export default RootLayout;
