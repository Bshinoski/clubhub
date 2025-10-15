// src/App.tsx
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";

const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
  </Routes>
);

export default App;
