import TopBar from "../components/TopBar/TopBar";
import SideBar from "../components/SideBar/SideBar";
export default function MainPage() {
  return (
    <div className="h-screen w-full bg-[#0A0F0A]">
      <TopBar />
      <SideBar />
    </div>
  );
}
