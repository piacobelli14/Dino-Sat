import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faXmark,
  faRightToBracket,
  faIdCard,
  faRightFromBracket,
  faCode,
  faSquarePlus,
  faComputer,
  faChevronDown,
  faChevronUp,
  faMountain,
  faSatellite,
  faPlantWilt,
  faSeedling,
  faRocket,
  faSatelliteDish,
  faMobileScreen,
  faEarthAmericas,
  faMeteor,
  faStar,
  faCloudMoon,
  faClipboard,
  faPlusSquare,
  faMagnifyingGlass,
  faList,
  faMapLocation,
  faWheatAwn,
  faDatabase,
  faGauge,
  faList12,
  faTable,
  faStarHalfStroke,
  faEarthOceania,
  faSun,
  faHillRockslide,
  faMoon,
  faBook,
  faPhone,
  faMobilePhone,
  faVideoCamera, 
  faUserCog,
  faUsersCog
} from "@fortawesome/free-solid-svg-icons";
import "../styles/helperStyles/NavBar.css";
import useAuth from "../UseAuth.jsx";
import useIsTouchDevice from "../TouchDevice.jsx";

const DinoLabsNav = ({ activePage }) => {
  const navigate = useNavigate();
  const isTouchDevice = useIsTouchDevice();
  const { token, isAdmin, loading, userID, organizationID } = useAuth();
  const [isHamburger, setIsHamburger] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openSubDropdown, setOpenSubDropdown] = useState(null);
  

  useEffect(() => {
    const checkTokenExpiration = () => {
      if (token) {
        const decodedToken = decodeToken(token);
        if (decodedToken.exp * 1000 < Date.now()) {
          setIsTokenExpired(true);
        } else {
          setIsTokenExpired(false);
        }
      }
    };

    checkTokenExpiration();
  }, [token]);

  useEffect(() => {
    if (isHamburger) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isHamburger]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userid");
    localStorage.removeItem("orgid");
    navigate("/login");
  };

  const decodeToken = (token) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return {};
    }
  };

  const toggleDropdown = (key) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const toggleSubDropdown = (key) => {
    setOpenSubDropdown((prev) => (prev === key ? null : key));
  };

  const closeMenuAndNavigate = (path) => {
    navigate(path);
    setIsHamburger(false);
    setOpenDropdown(null);
  };

  return (
    <>
      <div
        className="homeHeaderContainer"
        style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
      >
        <div className="homeTopNavBarContainer">
          <div className="homeSkipToContent">
            <img
              className="homeLogo"
              src={
                activePage === "sat"
                  ? "./DinoSatLogo.png"
                  : activePage === "geode"
                  ? "./DinoGeodeLogo.png"
                  : "./DinoSproutLogo.png"
              }
              alt="Logo"
            />
            <label className="homeHeader" style={{ color: "#f1f5f9" }}>
              {activePage === "sat"
                ? "Dino Sat"
                : activePage === "geode"
                ? "Dino Geode"
                : "Dino Sprout"}
            </label>
          </div>

          <div className="homeNavSupplement"></div>

          {!isTouchDevice && (
            <button
              className="homeHamburgerCircle"
              onClick={() => setIsHamburger(!isHamburger)}
            >
              <FontAwesomeIcon
                icon={isHamburger ? faXmark : faBars}
                className="homeHamburgerIcon"
                style={{ color: "#f1f5f9" }}
              />
            </button>
          )}
        </div>
      </div>

      {isHamburger && !isTouchDevice && (
        <div className="homeHamburgerPopout">
          <div className="homeHamburgerContent">
            {token && !isTokenExpired && (
              <>
               
                <button
                  className="navigationButtonWrapper"
                  onClick={() => toggleSubDropdown("sat-trackers")}
                  style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faClipboard} className="navigationButtonIcon" />
                    Trackers
                  </div>
                  <FontAwesomeIcon
                    icon={openSubDropdown === "sat-trackers" ? faChevronUp : faChevronDown}
                    className="navigationButtonIconTrailer"
                  />
                </button>

                {openSubDropdown === "sat-trackers" && (
                  <>
                    <button
                      className="navigationButtonWrapper"
                      onClick={() => navigate("/satellite-tracker")}
                      style={{ background: "linear-gradient(135deg, #222630 0%, #2f3645 50%, #3e485a 100%)" }}
                    >
                      <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                        <FontAwesomeIcon icon={faSatellite} className="navigationButtonIcon" />
                        Satellite Tracker
                      </div>
                    </button>

                    <button
                      className="navigationButtonWrapper"
                      onClick={() => navigate("/asteroid-tracker")}
                      style={{ background: "linear-gradient(135deg, #222630 0%, #2f3645 50%, #3e485a 100%)" }}
                    >
                      <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                        <FontAwesomeIcon icon={faHillRockslide} className="navigationButtonIcon" />
                        Asteroid Tracker
                      </div>
                    </button>

                    <button
                      className="navigationButtonWrapper"
                      onClick={() => navigate("/comet-tracker")}
                      style={{ background: "linear-gradient(135deg, #222630 0%, #2f3645 50%, #3e485a 100%)" }}
                    >
                      <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                        <FontAwesomeIcon icon={faMeteor} className="navigationButtonIcon" />
                        Comet Tracker
                      </div>
                    </button>
                    
                    
                  </>
                )}

                <button
                  className="navigationButtonWrapper"
                  onClick={() => toggleSubDropdown("sat-simulators")}
                  style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faComputer} className="navigationButtonIcon" />
                    Simulators
                  </div>
                  <FontAwesomeIcon
                    icon={openSubDropdown === "sat-simulators" ? faChevronUp : faChevronDown}
                    className="navigationButtonIconTrailer"
                  />
                </button>

                {openSubDropdown === "sat-simulators" && (
                  <>
                    <button
                      className="navigationButtonWrapper"
                      onClick={() => navigate("/simulator")}
                      style={{ background: "linear-gradient(135deg, #222630 0%, #2f3645 50%, #3e485a 100%)" }}
                    >
                      <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                        <FontAwesomeIcon icon={faMobilePhone} className="navigationButtonIcon" />
                        N-Body Simulator
                      </div>
                    </button>
                  </>
                )}
                
                <button
                  className="navigationButtonWrapper"
                  onClick={() => toggleSubDropdown("sat-monitoring")}
                  style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faGauge} className="navigationButtonIcon" />
                    Monitoring
                  </div>
                  <FontAwesomeIcon
                    icon={openSubDropdown === "sat-monitoring" ? faChevronUp : faChevronDown}
                    className="navigationButtonIconTrailer"
                  />
                </button>

                {openSubDropdown === "sat-monitoring" && (
                  <>
                    <button
                      className="navigationButtonWrapper"
                      onClick={() => navigate("/earth-conditions")}
                      style={{ background: "linear-gradient(135deg, #222630 0%, #2f3645 50%, #3e485a 100%)" }}
                    >
                      <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                        <FontAwesomeIcon icon={faEarthAmericas} className="navigationButtonIcon" />
                        Earth Conditions Monitor
                      </div>
                    </button>

                    <button
                      className="navigationButtonWrapper"
                      onClick={() => navigate("/satellite-feeds")}
                      style={{ background: "linear-gradient(135deg, #222630 0%, #2f3645 50%, #3e485a 100%)" }}
                    >
                      <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                        <FontAwesomeIcon icon={faVideoCamera} className="navigationButtonIcon" />
                        Live Satellite Feeds
                      </div>
                    </button>
                  </>
                )}

                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/celestial-catalog")}
                  style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faBook} className="navigationButtonIcon" />
                    Astronomical Reference
                  </div>
                </button>
                    
              </>
            )}

            {token && !isTokenExpired && (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/account")}
                  style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faUserCog} className="navigationButtonIcon" />
                    My Account
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}

              {token && !isTokenExpired && organizationID && (
                <button
                  className="navigationButtonWrapper"
                  onClick={() => navigate("/team")}
                  style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
                >
                  <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                    <FontAwesomeIcon icon={faUsersCog} className="navigationButtonIcon" />
                    My Team
                  </div>
                  <div
                    className="navigationButtonDivider"
                    style={{ backgroundColor: "#94a3b8" }}
                  />
                </button>
              )}


            {!token && (
              <button
                className="navigationButtonWrapper"
                onClick={() => navigate("/register")}
                style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
              >
                <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                  <FontAwesomeIcon icon={faIdCard} className="navigationButtonIcon" />
                  Sign Up
                </div>
                <div
                  className="navigationButtonDivider"
                  style={{ backgroundColor: "#94a3b8" }}
                />
              </button>
            )}

            {!token ? (
              <button
                className="navigationButtonWrapper"
                onClick={() => navigate("/login")}
                style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
              >
                <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                  <FontAwesomeIcon
                    icon={faRightToBracket}
                    className="navigationButtonIcon"
                  />
                  Login
                </div>
                <div
                  className="navigationButtonDivider"
                  style={{ backgroundColor: "#94a3b8" }}
                />
              </button>
            ) : (
              <button
                className="navigationButtonWrapper"
                onClick={handleLogout}
                style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
              >
                <div className="navigationButton" style={{ color: "#f1f5f9" }}>
                  <FontAwesomeIcon
                    icon={faRightFromBracket}
                    className="navigationButtonIcon"
                  />
                  Sign Out
                </div>
                <div
                  className="navigationButtonDivider"
                  style={{ backgroundColor: "#94a3b8" }}
                />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DinoLabsNav;