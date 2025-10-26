import TopBar from "../components/TopBar/TopBar";
import SideBar from "../components/SideBar/SideBar";
import SideIcons from "../components/SideIcons/SideIcons";
import { Provider } from "react-redux";
import store from "../store/store";
export default function MainPage() {
  return (
    <Provider store={store}>
      <div className="h-screen w-full bg-main-page-bg flex flex-col">
        <TopBar />
        <div className="flex-1 w-full flex">
          <SideIcons />
          <SideBar />
        </div>
      </div>
    </Provider>
  );
}
