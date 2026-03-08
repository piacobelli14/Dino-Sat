import React from "react";
import "../styles/helperStyles/Mobile.css";

const DinoSatMobile = () => {
  return (
    <div className="dinoSatUnavailableContainer">
      <div className="dinoSatUnavailableWrapper">
        <div className="dinoSatUnavailableContent">
          <img
            className="dinoSatUnavailableImage"
            src="./DinoSatLogo.png"
            alt="DinoSat Logo"
            onError={(e) => {
              e.target.src = "/fallback-logo.png";
            }}
          />
          <div className="dinoSatUnavailableTextStack">
            <h1 className="dinoSatUnavailableTitle">
              DinoSat Unavailable
            </h1>
            <p className="dinoSatUnavailableMessage">
              The platform is currently unavailable on mobile devices.
            </p>
            <p className="dinoSatUnavailableSubMessage">
              Please sign in on a computer to continue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DinoSatMobile;