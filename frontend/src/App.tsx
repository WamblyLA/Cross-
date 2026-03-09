import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import MainPage from "./pages/MainPage";
import AuthPage from "./pages/AuthPage";

export default function App() {
  const [rootPath, setRootPath] = useState<string | null>(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<MainPage rootPath={rootPath} setRootPath={setRootPath} />}
        />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}
