import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

import { useEffect, useState } from "react";
import "./styles/App.css";

import Login from "./pages/Authnetication/AuthLogin.jsx";
import Register from "./pages/Authnetication/AuthRegister.jsx";
import Reset from "./pages/Authnetication/AuthReset.jsx";
import Account from "./pages/Account/Account.jsx";
import Team from "./pages/Account/Team.jsx";
import EarthConditions from "./pages/Sat/EarthConditions/EarthConditions.jsx";
import SatelliteFeeds from "./pages/Sat/SatelliteFeeds/SatelliteFeeds.jsx";
import WeatherTracker from "./pages/Sat/Trackers/WeatherTracker/WeatherTracker.jsx";
import FlightTracker from "./pages/Sat/Trackers/FlightTracker/FlightTracker.jsx";
import SatelliteTracker from "./pages/Sat/Trackers/SatelliteTracker/SatelliteTracker.jsx";
import AsteroidTracker from "./pages/Sat/Trackers/AsteroidTracker/AsteroidTracker.jsx";
import CometTracker from "./pages/Sat/Trackers/CometTracker/CometTracker.jsx";
import NBodySimulator from "./pages/Sat/NBodySimulator/NBodySimulator.jsx";

function App() {
  const [osClass, setOsClass] = useState("");

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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset" element={<Reset />} />

          <Route path="/account" element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          } />

          <Route path="/team" element={
            <ProtectedRoute>
              <Team />
            </ProtectedRoute>
          } />

          <Route path="/earth-conditions" element={
            <ProtectedRoute>
              <EarthConditions />
            </ProtectedRoute>
          } />

          <Route path="/earth-conditions" element={
            <ProtectedRoute>
              <EarthConditions />
            </ProtectedRoute>
          } />

          <Route path="/satellite-feeds" element={
            <ProtectedRoute>
              <SatelliteFeeds />
            </ProtectedRoute>
          } />

          <Route path="/weather-tracker" element={
            <ProtectedRoute>
              <WeatherTracker />
            </ProtectedRoute>
          } />

          <Route path="/flight-tracker" element={
            <ProtectedRoute>
              <FlightTracker />
            </ProtectedRoute>
          } />

          <Route path="/satellite-tracker" element={
            <ProtectedRoute>
              <SatelliteTracker />
            </ProtectedRoute>
          } />

          <Route path="/asteroid-tracker" element={
            <ProtectedRoute>
              <AsteroidTracker />
            </ProtectedRoute>
          } />

          <Route path="/comet-tracker" element={
            <ProtectedRoute>
              <CometTracker />
            </ProtectedRoute>
          } />

          <Route path="/nbody-simulator" element={
            <ProtectedRoute>
              <NBodySimulator />
            </ProtectedRoute>
          } />

          <Route index element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;