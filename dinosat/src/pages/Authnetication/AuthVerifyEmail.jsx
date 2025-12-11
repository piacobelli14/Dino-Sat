import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/mainStyles/Authentication/AuthVerifyEmail.css"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMailBulk } from "@fortawesome/free-solid-svg-icons";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const ranRef = useRef(false);
  const [message, setMessage] = useState("Verifying...");
  const [showRetry, setShowRetry] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (resendStatus) {
      const timer = setTimeout(() => {
        setResendStatus(false);
        setResendMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [resendStatus]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (!token) {
      setShowRetry(true);
      return;
    }

    (async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_AUTH_URL}/verify-email?token=${token}`
        );
        const data = await response.json();

        if (response.status === 200) {
          navigate("/login");
        } else {
          setShowRetry(true);
        }
      } catch (error) {
        setShowRetry(true);
      }
    })();
  }, [location.search]);

  const handleResend = async () => {
    setResendMessage("");
    setResendLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_AUTH_URL}/resend-verification-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: resendEmail, 
            software: "dinosat" 
          }),
        }
      );
      const data = await response.json();
      setResendMessage(data.message || "Unable to resend. Please try again.");
      setResendStatus(true);
    } catch {
      setResendMessage("An error occurred. Please try again later.");
      setResendStatus(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="verificationPageWrapper"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="verificationHeaderContainer"
        style={{ background: "linear-gradient(135deg, #0a0c10 0%, #141820 50%, #1e242e 100%)" }}
      >
        {!showRetry ? (
          <div className="loading-wrapper">
            <div className="loading-circle" />
          </div>
        ) : (
          <div className="verifyHeroBackgroundWrapper">
            <div className="verifyHeroBackground">
                <div className="verifyBackgroundBlur resetBackgroundBlur1"></div>
                <div className="verifyBackgroundBlur resetBackgroundBlur2"></div>
                <div className="verifyBackgroundBlur resetBackgroundBlur3"></div>
            </div>

            <div className="verifyGridPattern"/>

            <div className="unverifiedEmailCell" style={{ position: "relative" }}>
              <FontAwesomeIcon
                icon={faMailBulk}
                size="3x"
                className="unverifiedEmailIcon"
              />
              <div className="unverifiedEmailText">
                <strong>This token is either expired or invalid.</strong><br/>
                If you have successfully created account, you can request another verification email below.
              </div>
              <input
                className="unverifiedInputWrapper"
                type="email"
                placeholder="Enter your email to resend"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <div className="unverifiedEmailButtons">
                {!resendStatus ? (
                  <button
                    className="unverifiedEmailRefresh"
                    style={{"background": "rgba(255, 255, 255, 0.2)"}}
                    onClick={handleResend}
                  >
                    <label className="loginInputText">Resend Verification Email</label>
                  </button>
                ) : (
                  <div className="unverifiedEmailText" style={{ opacity: 0.8 }}>
                    {resendMessage}
                  </div>
                )}
              </div>
              {resendLoading && (
                <div
                  className="loading-wrapper"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <div className="loading-circle" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
