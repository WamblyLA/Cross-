import TopBar from "../components/TopBar/TopBar";
import SideBar from "../components/SideBar/SideBar";
import SideIcons from "../components/SideIcons/SideIcons";
export default function MainPage() {
  return (
    <div className="h-screen w-full bg-[#0A0F0A] flex flex-col">
      <TopBar />
      <div className="flex-1 w-full flex">
        <SideIcons />
        <SideBar />
      </div>
    </div>
  );
}
