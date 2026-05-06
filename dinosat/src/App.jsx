import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useEffect, useState } from "react";
import "./styles/App.css";
import useIsTouchDevice from "./TouchDevice";
import DinoSatMobile from "./helpers/Mobile";

import Login from "./pages/Authnetication/AuthLogin.jsx";
import Register from "./pages/Authnetication/AuthRegister.jsx";
import Reset from "./pages/Authnetication/AuthReset.jsx";
import Verification from "./pages/Authnetication/AuthVerifyEmail.jsx";
import CelestialReference from "./pages/DinoSat/CelestialReference.jsx";
import SatelliteTracker from "./pages/DinoSat/DinoSatTrackers/SatelliteTracker.jsx";
import CometTracker from "./pages/DinoSat/DinoSatTrackers/CometTracker.jsx";
import AsteroidTracker from "./pages/DinoSat/DinoSatTrackers/AsteroidTracker.jsx";
import EarthConditions from "./pages/DinoSat/DinoSatMonitors/EarthConditions.jsx";
import Simulator from "./pages/DinoSat/DinoSatSimulators/Simulator.jsx";
import AddSpecimen from "./pages/DinoGeode/DinoGeodeAddSpecimen.jsx";
import BrowseSpecimen from "./pages/DinoGeode/DinoGeodeBrowseSpecimen.jsx";
import MineralCatalog from "./pages/DinoGeode/DinoGeodeMineralCatalog.jsx";
import DinoSproutBotanicalCatalog from "./pages/DinoSprout/DinoSproutBotanicalCatalog.jsx";

function App() {
  const [osClass, setOsClass] = useState("");
  const isTouchDevice = useIsTouchDevice();

  useEffect(() => {
    const detectOS = () => {
      const userAgent = navigator.userAgent;
      if (userAgent.indexOf("Win") !== -1) {
        return "windows";
      } else if (userAgent.indexOf("Mac") !== -1) {
        return "mac";
      }
      return "";
    };

    const os = detectOS();
    setOsClass(os);
  }, []);

  return (
    <Router>
      <div className={`App ${osClass}`}>
        {!isTouchDevice ? (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset" element={<Reset />} />
            <Route path="/verify" element={<Verification />} />

            <Route path="/celestial-catalog" element={<ProtectedRoute><CelestialReference /></ProtectedRoute>} />
            <Route path="/satellite-tracker" element={<ProtectedRoute><SatelliteTracker /></ProtectedRoute>} />
            <Route path="/comet-tracker" element={<ProtectedRoute><CometTracker /></ProtectedRoute>} />
            <Route path="/asteroid-tracker" element={<ProtectedRoute><AsteroidTracker /></ProtectedRoute>} />
            <Route path="/earth-conditions" element={<ProtectedRoute><EarthConditions /></ProtectedRoute>} />
            <Route path="/simulator" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />

            <Route path="/geode-add-specimen" element={<ProtectedRoute><AddSpecimen /></ProtectedRoute>} />
            <Route path="/geode-browse-specimen" element={<ProtectedRoute><BrowseSpecimen /></ProtectedRoute>} />
            <Route path="/geode-mineral-catalog" element={<ProtectedRoute><MineralCatalog /></ProtectedRoute>} />

            <Route path="/sprout-botanical-catalog" element={<DinoSproutBotanicalCatalog />} />

            <Route index element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="*" element={<DinoSatMobile />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;