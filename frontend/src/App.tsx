import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PrivateRoute from "./components/PrivateRoute";

const App = () => {
    return (
        <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected */}
            <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<LandingPage />} />
                {/* replace LandingPage with your real Dashboard when ready */}
            </Route>
        </Routes>
    );
};

export default App;
