import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faInfoCircle, faTh, faTimes, faPlay, faPause, faRedo, faBorderAll, 
  faPlus, faSquarePlus, faBars, faSquareXmark, faSatellite, faChartLine, 
  faChevronDown, faChevronUp, faXmarkSquare, faSquareCheck, faClone 
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatSimulators/Simulator.css";

export default function Simulator() {
  
  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"}/>
    </div>
  );
}