import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay, faPause, faRedo, faPlus, faTrash, faChartLine,
  faChevronDown, faChevronUp, faXmarkSquare, faCog, faGlobe,
  faRocket, faCrosshairs, faExpand, faMinus, faEdit, faEye,
  faEyeSlash, faFlask
} from "@fortawesome/free-solid-svg-icons";
import DinoLabsNav from "../../../helpers/Nav.jsx";
import DinoLabsColorPicker from "../../../helpers/ColorPicker.jsx";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import "../../../styles/helperStyles/Switch.css";
import "../../../styles/mainStyles/DinoSat/DinoSatSimulators/Simulator.css";

export default function NBodySimulator() {
  const SPEED_OF_LIGHT = 299792458.0;
  const AU = 149597870700.0;
  const G_CODATA = 6.67430e-11;
  const GM_SUN = 1.32712440042e20;
  const GM_EARTH = 3.986004418e14;
  const GM_JUPITER = 1.26712764e17;
  const SOLAR_RADIUS = 6.957e8;
  const EARTH_RADIUS_MEAN = 6.371e6;
  const EARTH_RADIUS_EQUATORIAL = 6.378137e6;
  const DAY_SECONDS = 86400.0;

  const INTEGRATORS = {
    VELOCITY_VERLET: "verlet",
    RK4: "rk4",
    YOSHIDA4: "yoshida4",
    RK5: "rk5"
  };

  const SPEED_OPTIONS = [
    { label: "0.1x", value: 0.1 },
    { label: "0.5x", value: 0.5 },
    { label: "1x", value: 1 },
    { label: "10x", value: 10 },
    { label: "100x", value: 100 },
    { label: "1000x", value: 1000 },
    { label: "10000x", value: 10000 }
  ];

  const [bodies, setBodies] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [timeStep, setTimeStep] = useState(60);
  const [speedMultiplier, setSpeedMultiplier] = useState(10);
  const [integrator, setIntegrator] = useState(INTEGRATORS.RK5);
  const [showTrails, setShowTrails] = useState(true);
  const [showVectors, setShowVectors] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [trailLength, setTrailLength] = useState(1000);
  const [gridWarpStrength, setGridWarpStrength] = useState(50);
  const [gridWarpSpread, setGridWarpSpread] = useState(90);
  const [selectedBody, setSelectedBody] = useState(null);
  const [focusedBody, setFocusedBody] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hudVisible, setHudVisible] = useState(false);
  const [addBodyModal, setAddBodyModal] = useState(false);
  const [editBodyModal, setEditBodyModal] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [scaleMode, setScaleMode] = useState("log");
  const [actualFps, setActualFps] = useState(60);
  const [addBodyColorPickerOpen, setAddBodyColorPickerOpen] = useState(false);
  const [editBodyColorPickerOpen, setEditBodyColorPickerOpen] = useState(false);

  const [softeningConfig, setSofteningConfig] = useState({
    enabled: false,
    mode: 'plummer',
    fixedLength: 1e6
  });

  const [physicsConfig, setPhysicsConfig] = useState({
    includeGR: false,
    grMode: '1pn',
    relativisticMode: false,
    cReductionFactor: 1000,
    includeJ2: false,
    j2BackReaction: true,
    timestepMethod: 'fixed',
    timestepEta: 0.02,
    doublePrecisionWarning: true,
    softeningWarningShown: false,
    collisionMode: 'none',
    collisionThreshold: 1.0,
    collisionMassLoss: 0.02,
    barycentricCorrection: true,
    useNormalizedUnits: true,
    enableRocheLimit: true,
    rocheDisruptionMode: 'warning',
    retardedGravity: true,
    positionHistoryLength: 100,
    historyBufferSize: 128
  });

  const [pnWarnings, setPnWarnings] = useState([]);

  const [newBody, setNewBody] = useState({
    name: "",
    mass: GM_SUN / G_CODATA,
    radius: SOLAR_RADIUS,
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    color: "#FFD700",
    j2: 0,
    j2Radius: null,
    spinAxisX: 0,
    spinAxisY: 0,
    spinAxisZ: 1,
    spinRate: 0,
    momentOfInertiaFactor: 0.4
  });

  const [orbitConfig, setOrbitConfig] = useState({
    enabled: true,
    centralBodyId: null,
    orbitType: "circular",
    distance: AU,
    eccentricity: 0,
    inclination: 0,
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 0,
    trueAnomaly: 0,
    prograde: true
  });

  const [trajectoryMode, setTrajectoryMode] = useState("orbit");

  const [flybyConfig, setFlybyConfig] = useState({
    targetBodyId: null,
    periapsisDistance: 1.0 * AU,
    vInfinity: 30000,
    approachAngle: 0,
    inclination: 0,
    inbound: true,
    startDistance: 10 * AU
  });

  const [interstellarConfig, setInterstellarConfig] = useState({
    referenceBodyId: null,
    periapsisDistance: 0.5 * AU,
    vInfinity: 26000,
    approachAngle: 45,
    inclination: 30,
    startDistance: 50 * AU
  });

  const createRingBuffer = useCallback((size) => {
    return {
      x: new Float64Array(size),
      y: new Float64Array(size),
      z: new Float64Array(size),
      vx: new Float64Array(size),
      vy: new Float64Array(size),
      vz: new Float64Array(size),
      t: new Float64Array(size),
      head: 0,
      count: 0,
      size: size
    };
  }, []);

  const ringBufferPush = useCallback((buffer, x, y, z, vx, vy, vz, t) => {
    const idx = buffer.head;
    buffer.x[idx] = x;
    buffer.y[idx] = y;
    buffer.z[idx] = z;
    buffer.vx[idx] = vx;
    buffer.vy[idx] = vy;
    buffer.vz[idx] = vz;
    buffer.t[idx] = t;
    buffer.head = (buffer.head + 1) % buffer.size;
    if (buffer.count < buffer.size) buffer.count++;
  }, []);

  const ringBufferGetIndex = useCallback((buffer, index) => {
    return (buffer.head - buffer.count + index + buffer.size) % buffer.size;
  }, []);

  const solveKeplerEquation = useCallback((M, e, tolerance = 1e-12, maxIter = 50) => {
    if (e < 1) {
      let E = M;
      for (let i = 0; i < maxIter; i++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < tolerance) break;
      }
      return E;
    } else {
      let H = M;
      for (let i = 0; i < maxIter; i++) {
        const dH = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1);
        H -= dH;
        if (Math.abs(dH) < tolerance) break;
      }
      return H;
    }
  }, []);

  const stateVectorsToOrbitalElements = useCallback((r_vec, v_vec, mu) => {
    const r = Math.sqrt(r_vec.x * r_vec.x + r_vec.y * r_vec.y + r_vec.z * r_vec.z);
    const v = Math.sqrt(v_vec.x * v_vec.x + v_vec.y * v_vec.y + v_vec.z * v_vec.z);
    const h_vec = {
      x: r_vec.y * v_vec.z - r_vec.z * v_vec.y,
      y: r_vec.z * v_vec.x - r_vec.x * v_vec.z,
      z: r_vec.x * v_vec.y - r_vec.y * v_vec.x
    };
    const h = Math.sqrt(h_vec.x * h_vec.x + h_vec.y * h_vec.y + h_vec.z * h_vec.z);
    const rdotv = r_vec.x * v_vec.x + r_vec.y * v_vec.y + r_vec.z * v_vec.z;
    const e_vec = {
      x: (v_vec.y * h_vec.z - v_vec.z * h_vec.y) / mu - r_vec.x / r,
      y: (v_vec.z * h_vec.x - v_vec.x * h_vec.z) / mu - r_vec.y / r,
      z: (v_vec.x * h_vec.y - v_vec.y * h_vec.x) / mu - r_vec.z / r
    };
    const e = Math.sqrt(e_vec.x * e_vec.x + e_vec.y * e_vec.y + e_vec.z * e_vec.z);
    const energy = v * v / 2 - mu / r;
    const a = e < 1 ? -mu / (2 * energy) : mu / (2 * energy);
    const n_vec = { x: -h_vec.y, y: h_vec.x, z: 0 };
    const n = Math.sqrt(n_vec.x * n_vec.x + n_vec.y * n_vec.y);
    const inc = h > 1e-10 ? Math.acos(Math.max(-1, Math.min(1, h_vec.z / h))) : 0;
    let Omega = 0;
    if (n > 1e-10) {
      Omega = Math.acos(Math.max(-1, Math.min(1, n_vec.x / n)));
      if (n_vec.y < 0) Omega = 2 * Math.PI - Omega;
    }
    let omega = 0;
    if (n > 1e-10 && e > 1e-10) {
      const ndote = n_vec.x * e_vec.x + n_vec.y * e_vec.y + n_vec.z * e_vec.z;
      omega = Math.acos(Math.max(-1, Math.min(1, ndote / (n * e))));
      if (e_vec.z < 0) omega = 2 * Math.PI - omega;
    } else if (e > 1e-10) {
      omega = Math.atan2(e_vec.y, e_vec.x);
      if (omega < 0) omega += 2 * Math.PI;
    }
    let nu = 0;
    if (e > 1e-10) {
      const edotr = e_vec.x * r_vec.x + e_vec.y * r_vec.y + e_vec.z * r_vec.z;
      nu = Math.acos(Math.max(-1, Math.min(1, edotr / (e * r))));
      if (rdotv < 0) nu = 2 * Math.PI - nu;
    }
    return { a, e, inc, Omega, omega, nu, h, mu };
  }, []);

  const orbitalElementsToStateVectors = useCallback((elements, centralPos, centralVel) => {
    const { a, e, inc, Omega, omega, nu, mu } = elements;
    const p = e < 1 ? a * (1 - e * e) : Math.abs(a) * (e * e - 1);
    const r = p / (1 + e * Math.cos(nu));
    const rPQW = { x: r * Math.cos(nu), y: r * Math.sin(nu), z: 0 };
    const sqrtMuP = Math.sqrt(mu / p);
    const vPQW = { x: -sqrtMuP * Math.sin(nu), y: sqrtMuP * (e + Math.cos(nu)), z: 0 };
    const cosO = Math.cos(Omega), sinO = Math.sin(Omega);
    const cosI = Math.cos(inc), sinI = Math.sin(inc);
    const cosW = Math.cos(omega), sinW = Math.sin(omega);
    const R = [
      [cosO * cosW - sinO * sinW * cosI, -cosO * sinW - sinO * cosW * cosI, sinO * sinI],
      [sinO * cosW + cosO * sinW * cosI, -sinO * sinW + cosO * cosW * cosI, -cosO * sinI],
      [sinW * sinI, cosW * sinI, cosI]
    ];
    const rInertial = {
      x: R[0][0] * rPQW.x + R[0][1] * rPQW.y,
      y: R[1][0] * rPQW.x + R[1][1] * rPQW.y,
      z: R[2][0] * rPQW.x + R[2][1] * rPQW.y
    };
    const vInertial = {
      x: R[0][0] * vPQW.x + R[0][1] * vPQW.y,
      y: R[1][0] * vPQW.x + R[1][1] * vPQW.y,
      z: R[2][0] * vPQW.x + R[2][1] * vPQW.y
    };
    return {
      x: centralPos.x + rInertial.x,
      y: centralPos.y + rInertial.y,
      z: centralPos.z + rInertial.z,
      vx: centralVel.x + vInertial.x,
      vy: centralVel.y + vInertial.y,
      vz: centralVel.z + vInertial.z
    };
  }, []);

  const propagateKeplerBackward = useCallback((body, centralBody, dt, mu) => {
    const r_vec = { x: body.x - centralBody.x, y: body.y - centralBody.y, z: body.z - centralBody.z };
    const v_vec = { x: body.vx - centralBody.vx, y: body.vy - centralBody.vy, z: body.vz - centralBody.vz };
    const elements = stateVectorsToOrbitalElements(r_vec, v_vec, mu);
    const { a, e, inc, Omega, omega, nu } = elements;
    if (e < 1e-10 || Math.abs(a) < 1e-10) {
      return {
        x: body.x + body.vx * dt,
        y: body.y + body.vy * dt,
        z: body.z + body.vz * dt,
        vx: body.vx,
        vy: body.vy,
        vz: body.vz
      };
    }
    let M0, n;
    if (e < 1) {
      const E0 = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
      M0 = E0 - e * Math.sin(E0);
      n = Math.sqrt(mu / (a * a * a));
    } else {
      const H0 = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
      M0 = e * Math.sinh(H0) - H0;
      n = Math.sqrt(mu / (Math.abs(a) * Math.abs(a) * Math.abs(a)));
    }
    const M = M0 + n * dt;
    let nuNew;
    if (e < 1) {
      const E = solveKeplerEquation(M, e);
      nuNew = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
    } else {
      const H = solveKeplerEquation(M, e);
      nuNew = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2));
    }
    const newElements = { a, e, inc, Omega, omega, nu: nuNew, mu };
    return orbitalElementsToStateVectors(newElements, centralBody, { x: centralBody.vx, y: centralBody.vy, z: centralBody.vz });
  }, [stateVectorsToOrbitalElements, orbitalElementsToStateVectors, solveKeplerEquation]);

  const initializeHistoryBuffer = useCallback((body, allBodies, currentTime, bufferSize, effectiveC) => {
    const buffer = createRingBuffer(bufferSize);
    let maxDist = AU * 50;
    const maxRetardationTime = maxDist / effectiveC;
    const dtHistory = maxRetardationTime / bufferSize;
    let centralBody = null;
    let maxGM = 0;
    for (let j = 0; j < allBodies.length; j++) {
      if (allBodies[j].id !== body.id && allBodies[j].gm > maxGM) {
        maxGM = allBodies[j].gm;
        centralBody = allBodies[j];
      }
    }
    for (let i = 0; i < bufferSize; i++) {
      const tPast = currentTime - (bufferSize - 1 - i) * dtHistory;
      const dt = tPast - currentTime;
      let pastState;
      if (centralBody && maxGM > body.gm * 0.01) {
        const mu = centralBody.gm + body.gm;
        pastState = propagateKeplerBackward(body, centralBody, dt, mu);
      } else {
        pastState = {
          x: body.x + body.vx * dt,
          y: body.y + body.vy * dt,
          z: body.z + body.vz * dt,
          vx: body.vx,
          vy: body.vy,
          vz: body.vz
        };
      }
      ringBufferPush(buffer, pastState.x, pastState.y, pastState.z, pastState.vx, pastState.vy, pastState.vz, tPast);
    }
    return buffer;
  }, [createRingBuffer, ringBufferPush, propagateKeplerBackward, AU]);

  const softeningKernels = useMemo(() => ({
    plummer: {
      forceMod: (r, eps) => {
        const r2 = r * r;
        const eps2 = eps * eps;
        const denom = r2 + eps2;
        return (r2 * r) / Math.pow(denom, 1.5);
      },
      potentialFactor: (r, eps) => {
        const r2 = r * r;
        const eps2 = eps * eps;
        return 1.0 / Math.sqrt(r2 + eps2);
      }
    },
    spline: {
      forceMod: (r, eps) => {
        const h = eps;
        const u = r / h;
        if (u >= 2.0) {
          return 1.0;
        }
        let W;
        if (u < 1.0) {
          W = (4.0 / 3.0) - 1.2 * u * u + 0.5 * u * u * u;
        } else {
          W = (8.0 / 3.0) - 3.0 * u + 1.2 * u * u - (1.0 / 6.0) * u * u * u - 1.0 / (15.0 * u * u);
        }
        return W;
      },
      potentialFactor: (r, eps) => {
        const h = eps;
        const u = r / h;
        if (u >= 2.0) {
          return 1.0 / r;
        }
        let phi;
        if (u < 1.0) {
          phi = (1.0 / h) * ((2.0 / 3.0) * u * u - 0.3 * u * u * u * u + 0.1 * u * u * u * u * u - 7.0 / 5.0);
        } else {
          phi = (1.0 / h) * ((4.0 / 3.0) * u * u - u * u * u + 0.3 * u * u * u * u - (1.0 / 30.0) * u * u * u * u * u - 8.0 / 5.0 + 1.0 / (15.0 * u));
        }
        return -phi;
      }
    },
    wendlandC2: {
      forceMod: (r, eps) => {
        const h = 2.0 * eps;
        const q = r / h;
        if (q >= 1.0) return 1.0;
        const omq = 1.0 - q;
        const omq3 = omq * omq * omq;
        return 1.0 - omq3 * omq * (1.0 + 4.0 * q);
      },
      potentialFactor: (r, eps) => {
        const h = 2.0 * eps;
        const q = r / h;
        if (q >= 1.0) return 1.0 / r;
        const omq = 1.0 - q;
        const omq4 = omq * omq * omq * omq;
        const phi = omq4 * (1.0 + 4.0 * q) + (21.0 / 5.0) * q * q - (4.0 / 3.0) * q * q * q;
        return phi / h;
      }
    }
  }), []);

  const calculateSoftening = useCallback((bodyStates, config) => {
    if (!config.enabled) return new Array(bodyStates.length).fill(0);
    return new Array(bodyStates.length).fill(config.fixedLength);
  }, []);

  const symmetricSoftening = useCallback((eps_i, eps_j) => {
    return 0.5 * (eps_i + eps_j);
  }, []);

  const getEffectiveSpeedOfLight = useCallback(() => {
    if (physicsConfig.relativisticMode && physicsConfig.includeGR) {
      return SPEED_OF_LIGHT / physicsConfig.cReductionFactor;
    }
    return SPEED_OF_LIGHT;
  }, [physicsConfig.relativisticMode, physicsConfig.includeGR, physicsConfig.cReductionFactor, SPEED_OF_LIGHT]);

  const toNormalizedUnits = useCallback((bodyStates) => {
    if (bodyStates.length === 0) return { bodies: [], scale: { mass: 1, length: 1, time: 1, vel: 1, G: G_CODATA } };

    let totalMass = 0;
    let maxDist = 0;

    for (let i = 0; i < bodyStates.length; i++) {
      totalMass += bodyStates[i].gm / G_CODATA;
      for (let j = i + 1; j < bodyStates.length; j++) {
        const dx = bodyStates[j].x - bodyStates[i].x;
        const dy = bodyStates[j].y - bodyStates[i].y;
        const dz = bodyStates[j].z - bodyStates[i].z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > maxDist) maxDist = d;
      }
    }

    if (maxDist < 1e6) maxDist = AU;
    if (totalMass < 1) totalMass = GM_SUN / G_CODATA;

    const massScale = totalMass;
    const lengthScale = maxDist;
    const timeScale = Math.sqrt(lengthScale * lengthScale * lengthScale / (G_CODATA * massScale));
    const velScale = lengthScale / timeScale;
    const effectiveC = getEffectiveSpeedOfLight();

    const normalized = bodyStates.map(b => ({
      ...b,
      gm: b.gm / (G_CODATA * massScale),
      x: b.x / lengthScale,
      y: b.y / lengthScale,
      z: b.z / lengthScale,
      vx: b.vx / velScale,
      vy: b.vy / velScale,
      vz: b.vz / velScale,
      radius: b.radius / lengthScale,
      j2Radius: b.j2Radius ? b.j2Radius / lengthScale : null,
      errX: (b.errX || 0) / lengthScale,
      errY: (b.errY || 0) / lengthScale,
      errZ: (b.errZ || 0) / lengthScale,
      errVx: (b.errVx || 0) / velScale,
      errVy: (b.errVy || 0) / velScale,
      errVz: (b.errVz || 0) / velScale,
      positionHistory: b.positionHistory,
      orientation: b.orientation,
      omegaBody_x: b.omegaBody_x,
      omegaBody_y: b.omegaBody_y
    }));

    return {
      bodies: normalized,
      scale: {
        mass: massScale,
        length: lengthScale,
        time: timeScale,
        vel: velScale,
        G: G_CODATA,
        c: effectiveC / velScale
      }
    };
  }, [AU, GM_SUN, G_CODATA, getEffectiveSpeedOfLight]);

  const fromNormalizedUnits = useCallback((normalizedBodies, scale, originalBodies) => {
    return normalizedBodies.map((nb) => {
      const orig = originalBodies.find(ob => ob.id === nb.id);
      return {
        ...(orig || {}),
        ...nb,
        gm: nb.gm * G_CODATA * scale.mass,
        radius: nb.radius * scale.length,
        j2Radius: nb.j2Radius ? nb.j2Radius * scale.length : null,
        x: nb.x * scale.length,
        y: nb.y * scale.length,
        z: nb.z * scale.length,
        vx: nb.vx * scale.vel,
        vy: nb.vy * scale.vel,
        vz: nb.vz * scale.vel,
        errX: (nb.errX || 0) * scale.length,
        errY: (nb.errY || 0) * scale.length,
        errZ: (nb.errZ || 0) * scale.length,
        errVx: (nb.errVx || 0) * scale.vel,
        errVy: (nb.errVy || 0) * scale.vel,
        errVz: (nb.errVz || 0) * scale.vel,
        positionHistory: nb.positionHistory,
        orientation: nb.orientation,
        omegaBody_x: nb.omegaBody_x,
        omegaBody_y: nb.omegaBody_y,
        trail: orig ? orig.trail : []
      };
    });
  }, [G_CODATA]);

  const applyBarycentricCorrection = useCallback((bodyStates) => {
    const n = bodyStates.length;
    if (n === 0) return bodyStates;

    let totalMass = 0;
    let comX = 0, comY = 0, comZ = 0;
    let comVx = 0, comVy = 0, comVz = 0;

    for (let i = 0; i < n; i++) {
      const m = bodyStates[i].gm;
      totalMass += m;
      comX += m * bodyStates[i].x;
      comY += m * bodyStates[i].y;
      comZ += m * bodyStates[i].z;
      comVx += m * bodyStates[i].vx;
      comVy += m * bodyStates[i].vy;
      comVz += m * bodyStates[i].vz;
    }

    if (totalMass === 0) return bodyStates;

    comX /= totalMass;
    comY /= totalMass;
    comZ /= totalMass;
    comVx /= totalMass;
    comVy /= totalMass;
    comVz /= totalMass;

    return bodyStates.map(b => ({
      ...b,
      x: b.x - comX,
      y: b.y - comY,
      z: b.z - comZ,
      vx: b.vx - comVx,
      vy: b.vy - comVy,
      vz: b.vz - comVz
    }));
  }, []);

  const calculateRocheLimit = useCallback((primaryMass, primaryRadius, secondaryDensity) => {
    const primaryDensity = primaryMass / ((4/3) * Math.PI * Math.pow(primaryRadius, 3));
    return 2.44 * primaryRadius * Math.pow(primaryDensity / secondaryDensity, 1/3);
  }, []);

  const checkRocheLimitViolations = useCallback((bodyStates, config) => {
    if (!config.enableRocheLimit) return { violations: [], debrisConversions: [] };
    
    const violations = [];
    const debrisConversions = [];
    const n = bodyStates.length;

    for (let i = 0; i < n; i++) {
      if (bodyStates[i].isDebris) continue;
      
      for (let j = 0; j < n; j++) {
        if (i === j || bodyStates[j].isDebris) continue;
        
        const massI = bodyStates[i].gm / G_CODATA;
        const massJ = bodyStates[j].gm / G_CODATA;
        
        if (massJ > massI * 0.1) continue;
        
        const dx = bodyStates[j].x - bodyStates[i].x;
        const dy = bodyStates[j].y - bodyStates[i].y;
        const dz = bodyStates[j].z - bodyStates[i].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const radiusI = bodyStates[i].radius;
        const radiusJ = bodyStates[j].radius;
        const densityJ = massJ / ((4/3) * Math.PI * Math.pow(radiusJ, 3));
        
        const rocheLimit = calculateRocheLimit(massI, radiusI, densityJ);
        
        if (dist < rocheLimit && dist > radiusI + radiusJ) {
          violations.push({
            primaryId: bodyStates[i].id,
            primaryName: bodyStates[i].name,
            secondaryId: bodyStates[j].id,
            secondaryName: bodyStates[j].name,
            distance: dist,
            rocheLimit: rocheLimit,
            ratio: dist / rocheLimit
          });
          
          if (config.rocheDisruptionMode === 'disrupt') {
            debrisConversions.push(bodyStates[j].id);
          }
        }
      }
    }
    
    return { violations, debrisConversions };
  }, [G_CODATA, calculateRocheLimit]);

  const convertToDebris = useCallback((bodyStates, debrisIds) => {
    if (debrisIds.length === 0) return bodyStates;
    
    return bodyStates.map(b => {
      if (debrisIds.includes(b.id)) {
        return {
          ...b,
          isDebris: true,
          visible: false,
          name: `${b.name} (Debris)`
        };
      }
      return b;
    });
  }, []);

  const detectAndHandleCollisions = useCallback((bodyStates, config, scale = null) => {
    const n = bodyStates.length;
    if (n < 2 || config.collisionMode === 'none') return { states: bodyStates, collisions: [] };

    const collisions = [];
    const toRemove = new Set();
    let states = bodyStates.map(b => ({ ...b }));

    for (let i = 0; i < n; i++) {
      if (toRemove.has(i) || states[i].isDebris) continue;
      for (let j = i + 1; j < n; j++) {
        if (toRemove.has(j) || states[j].isDebris) continue;

        const dx = states[j].x - states[i].x;
        const dy = states[j].y - states[i].y;
        const dz = states[j].z - states[i].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const collisionDist = (states[i].radius + states[j].radius) * config.collisionThreshold;

        if (dist < collisionDist && dist > 0) {
          if (config.collisionMode === 'merge') {
            const mi = states[i].gm;
            const mj = states[j].gm;
            const massLossFraction = config.collisionMassLoss || 0;
            const totalMPreLoss = mi + mj;
            const totalM = totalMPreLoss * (1 - massLossFraction);

            const merged = {
              ...states[i],
              ...(mi >= mj ? states[i] : states[j]),
              id: mi >= mj ? states[i].id : states[j].id,
              name: mi >= mj ? states[i].name : states[j].name,
              gm: totalM,
              x: (mi * states[i].x + mj * states[j].x) / totalMPreLoss,
              y: (mi * states[i].y + mj * states[j].y) / totalMPreLoss,
              z: (mi * states[i].z + mj * states[j].z) / totalMPreLoss,
              vx: (mi * states[i].vx + mj * states[j].vx) / totalMPreLoss,
              vy: (mi * states[i].vy + mj * states[j].vy) / totalMPreLoss,
              vz: (mi * states[i].vz + mj * states[j].vz) / totalMPreLoss,
              radius: Math.pow(Math.pow(states[i].radius, 3) + Math.pow(states[j].radius, 3), 1 / 3) * Math.pow(1 - massLossFraction, 1/3),
              trail: mi >= mj ? states[i].trail : states[j].trail,
              positionHistory: mi >= mj ? states[i].positionHistory : states[j].positionHistory
            };

            states[i] = merged;
            toRemove.add(j);
            collisions.push({ type: 'merge', bodies: [states[i].id, states[j].id], massLost: totalMPreLoss * massLossFraction });
          }
        }
      }
    }

    if (toRemove.size > 0) {
      states = states.filter((_, idx) => !toRemove.has(idx));
    }

    return { states, collisions };
  }, []);

  const openAddBodyModal = useCallback(() => {
    if (bodies.length === 0) {
      setNewBody({
        name: "Sun",
        mass: GM_SUN / G_CODATA,
        radius: SOLAR_RADIUS,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        color: "#FFD700",
        j2: 0,
        j2Radius: null,
        spinAxisX: 0,
        spinAxisY: 0,
        spinAxisZ: 1,
        spinRate: 2.87e-6,
        momentOfInertiaFactor: 0.07
      });
      setTrajectoryMode("manual");
      setOrbitConfig(prev => ({ ...prev, enabled: false, centralBodyId: null }));
    } else {
      setNewBody({
        name: "",
        mass: GM_EARTH / G_CODATA,
        radius: EARTH_RADIUS_MEAN,
        x: AU, y: 0, z: 0,
        vx: 0, vy: 29780, vz: 0,
        color: "#4ECDC4",
        j2: 0.001083,
        j2Radius: EARTH_RADIUS_EQUATORIAL,
        spinAxisX: 0,
        spinAxisY: 0,
        spinAxisZ: 1,
        spinRate: 7.292e-5,
        momentOfInertiaFactor: 0.331
      });
      setTrajectoryMode("orbit");
      setOrbitConfig({
        enabled: true,
        centralBodyId: bodies[0]?.id || null,
        orbitType: "circular",
        distance: AU,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        trueAnomaly: 0,
        prograde: true
      });
      setFlybyConfig({
        targetBodyId: bodies[0]?.id || null,
        periapsisDistance: 1.0 * AU,
        vInfinity: 30000,
        approachAngle: 0,
        inclination: 0,
        inbound: true,
        startDistance: 10 * AU
      });
      setInterstellarConfig({
        referenceBodyId: bodies[0]?.id || null,
        periapsisDistance: 0.5 * AU,
        vInfinity: 26000,
        approachAngle: 45,
        inclination: 30,
        startDistance: 50 * AU
      });
    }
    setAddBodyModal(true);
  }, [bodies, GM_SUN, SOLAR_RADIUS, GM_EARTH, EARTH_RADIUS_MEAN, EARTH_RADIUS_EQUATORIAL, AU, G_CODATA]);

  const [systemStats, setSystemStats] = useState({
    totalEnergy: 0,
    kineticEnergy: 0,
    potentialEnergy: 0,
    relativisticEnergy: 0,
    totalMomentum: { x: 0, y: 0, z: 0 },
    centerOfMass: { x: 0, y: 0, z: 0 },
    bodyCount: 0,
    initialEnergy: null,
    energyDrift: 0,
    rocheViolations: []
  });

  const [hudPosition, setHudPosition] = useState({ x: 0, y: 0 });
  const [isDraggingHud, setIsDraggingHud] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const meshesRef = useRef({});
  const trailsRef = useRef({});
  const labelsRef = useRef({});
  const vectorsRef = useRef({});
  const gridRef = useRef(null);
  const labelContainerRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const fpsCounterRef = useRef(0);
  const lastFpsTimeRef = useRef(0);
  const hudPanelRef = useRef(null);
  const initialEnergyRef = useRef(null);
  const bodiesRef = useRef([]);
  const simulationTimeRef = useRef(0);
  const mergedBodyIdsRef = useRef(new Set());
  const initialBodiesRef = useRef([]);

  bodiesRef.current = bodies;
  simulationTimeRef.current = simulationTime;

  const generateId = () => `body_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const rotateVector = useCallback((vec, omega, inc, argPeri) => {
    const cosO = Math.cos(omega);
    const sinO = Math.sin(omega);
    const cosI = Math.cos(inc);
    const sinI = Math.sin(inc);
    const cosW = Math.cos(argPeri);
    const sinW = Math.sin(argPeri);
    const x = vec.x;
    const y = vec.y;
    const z = vec.z;
    const Px = cosW * x - sinW * y;
    const Py = sinW * x + cosW * y;
    const Pz = z;
    const Ix = Px;
    const Iy = Py * cosI - Pz * sinI;
    const Iz = Py * sinI + Pz * cosI;
    return {
      x: Ix * cosO - Iy * sinO,
      y: Ix * sinO + Iy * cosO,
      z: Iz
    };
  }, []);

  const calculateOrbitalState = useCallback((centralBody, config) => {
    if (!centralBody) return null;
    const { orbitType, distance, eccentricity, inclination, longitudeOfAscendingNode, argumentOfPeriapsis, trueAnomaly, prograde } = config;
    const mu = centralBody.gm;
    let e = eccentricity;
    switch (orbitType) {
      case "circular": e = 0; break;
      case "elliptical": e = Math.max(0, Math.min(0.9999, eccentricity)); break;
      case "parabolic": e = 1.0; break;
      case "hyperbolic": e = Math.max(1.0001, eccentricity); break;
      default: e = 0;
    }
    let p;
    if (orbitType === "parabolic") {
      p = 2 * distance;
    } else if (orbitType === "hyperbolic") {
      const a = distance / (1 - e);
      p = Math.abs(a) * (e * e - 1);
    } else {
      const a = distance / (1 - e);
      p = a * (1 - e * e);
    }
    const nuRad = (trueAnomaly * Math.PI) / 180;
    const cosNu = Math.cos(nuRad);
    const sinNu = Math.sin(nuRad);
    const r = p / (1 + e * cosNu);
    const rPQw = { x: r * cosNu, y: r * sinNu, z: 0 };
    const sqrtMuP = Math.sqrt(mu / p);
    let vPQw = {
      x: -sqrtMuP * sinNu,
      y: sqrtMuP * (e + cosNu),
      z: 0
    };
    if (!prograde) {
      vPQw.x = -vPQw.x;
      vPQw.y = -vPQw.y;
      vPQw.z = -vPQw.z;
    }
    const omegaRad = (longitudeOfAscendingNode * Math.PI) / 180;
    const incRad = (inclination * Math.PI) / 180;
    const argPeriRad = (argumentOfPeriapsis * Math.PI) / 180;
    const rInertial = rotateVector(rPQw, omegaRad, incRad, argPeriRad);
    const vInertial = rotateVector(vPQw, omegaRad, incRad, argPeriRad);
    return {
      x: centralBody.x + rInertial.x,
      y: centralBody.y + rInertial.y,
      z: centralBody.z + rInertial.z,
      vx: centralBody.vx + vInertial.x,
      vy: centralBody.vy + vInertial.y,
      vz: centralBody.vz + vInertial.z
    };
  }, [rotateVector]);

  const getOrbitalInfo = useCallback((centralBody, config) => {
    if (!centralBody) return "Select a central body";
    const mu = centralBody.gm;
    const r = config.distance;
    let e = config.eccentricity;
    switch (config.orbitType) {
      case "circular": e = 0; break;
      case "parabolic": e = 1; break;
      case "hyperbolic": e = Math.max(1.0001, e); break;
      default: e = Math.max(0, Math.min(0.9999, e));
    }
    let a, p;
    if (config.orbitType === "parabolic") {
      p = 2 * r;
    } else if (config.orbitType === "hyperbolic") {
      a = r / (1 - e);
      p = Math.abs(a) * (e * e - 1);
    } else {
      a = r / (1 - e);
      p = a * (1 - e * e);
    }
    const nuRad = (config.trueAnomaly * Math.PI) / 180;
    const dist = p / (1 + e * Math.cos(nuRad));
    const speed = Math.sqrt(mu * (2 / dist - (Math.abs(1 / a) * (e >= 1 ? -1 : 1))));
    let period = "∞";
    if (config.orbitType === "circular" || config.orbitType === "elliptical") {
      const T = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
      period = formatTime(T);
    }
    return `v=${(speed / 1000).toFixed(2)} km/s, T=${period}`;
  }, []);

  const calculateFlybyState = useCallback((targetBody, config) => {
    if (!targetBody) return null;
    const { periapsisDistance, vInfinity, approachAngle, inclination, inbound, startDistance } = config;
    if (vInfinity <= 0 || periapsisDistance <= 0 || startDistance <= periapsisDistance) return null;
    const mu = targetBody.gm;
    const rp = periapsisDistance;
    const vinf = vInfinity;
    const e = 1 + (rp * vinf * vinf) / mu;
    const a = -mu / (vinf * vinf);
    const p = rp * (1 + e);
    const nuInf = Math.acos(-1 / e);
    const cosNu = (p / startDistance - 1) / e;
    let nu = Math.acos(Math.max(-1, Math.min(1, cosNu)));
    if (inbound) nu = -nu;
    const r = p / (1 + e * Math.cos(nu));
    const rPQw = { x: r * Math.cos(nu), y: r * Math.sin(nu), z: 0 };
    const sqrtMuP = Math.sqrt(mu / p);
    const vPQw = { x: -sqrtMuP * Math.sin(nu), y: sqrtMuP * (e + Math.cos(nu)), z: 0 };
    const deflection = 2 * Math.asin(1 / e);
    const approachRad = (approachAngle * Math.PI) / 180;
    const incRad = (inclination * Math.PI) / 180;
    const omega = approachRad - (Math.PI - Math.abs(nuInf));
    const rInertial = rotateVector(rPQw, omega, incRad, 0);
    const vInertial = rotateVector(vPQw, omega, incRad, 0);
    const b = -a * Math.sqrt(e * e - 1);
    const vPeriapsis = Math.sqrt(vinf * vinf + 2 * mu / rp);
    return {
      x: targetBody.x + rInertial.x,
      y: targetBody.y + rInertial.y,
      z: targetBody.z + rInertial.z,
      vx: targetBody.vx + vInertial.x,
      vy: targetBody.vy + vInertial.y,
      vz: targetBody.vz + vInertial.z,
      eccentricity: e,
      deflectionAngle: deflection * 180 / Math.PI,
      periapsisVelocity: vPeriapsis,
      impactParameter: b,
      trueAnomaly: nu * 180 / Math.PI
    };
  }, [rotateVector]);

  const calculateInterstellarState = useCallback((referenceBody, config) => {
    if (!referenceBody) return null;
    const { periapsisDistance, vInfinity, approachAngle, inclination, startDistance } = config;
    if (vInfinity <= 0 || periapsisDistance <= 0 || startDistance <= periapsisDistance) return null;
    const mu = referenceBody.gm;
    const rp = periapsisDistance;
    const vinf = vInfinity;
    const e = 1 + (rp * vinf * vinf) / mu;
    const a = -mu / (vinf * vinf);
    const p = rp * (1 + e);
    const nuInf = Math.acos(-1 / e);
    const cosNu = (p / startDistance - 1) / e;
    let nu = -Math.acos(Math.max(-1, Math.min(1, cosNu)));
    const r = p / (1 + e * Math.cos(nu));
    const rPQw = { x: r * Math.cos(nu), y: r * Math.sin(nu), z: 0 };
    const sqrtMuP = Math.sqrt(mu / p);
    const vPQw = { x: -sqrtMuP * Math.sin(nu), y: sqrtMuP * (e + Math.cos(nu)), z: 0 };
    const approachRad = (approachAngle * Math.PI) / 180;
    const incRad = (inclination * Math.PI) / 180;
    const omega = approachRad - (Math.PI - Math.abs(nuInf));
    const rInertial = rotateVector(rPQw, omega, incRad, 0);
    const vInertial = rotateVector(vPQw, omega, incRad, 0);
    const b = -a * Math.sqrt(e * e - 1);
    const vPeriapsis = Math.sqrt(vinf * vinf + 2 * mu / rp);
    return {
      x: referenceBody.x + rInertial.x,
      y: referenceBody.y + rInertial.y,
      z: referenceBody.z + rInertial.z,
      vx: referenceBody.vx + vInertial.x,
      vy: referenceBody.vy + vInertial.y,
      vz: referenceBody.vz + vInertial.z,
      eccentricity: e,
      periapsisVelocity: vPeriapsis,
      impactParameter: b
    };
  }, [rotateVector]);

  const scaleVector = useCallback((x, y, z) => {
    if (scaleMode === "linear") {
      const scale = 50 / AU;
      return { x: x * scale, y: y * scale, z: z * scale };
    } else {
      const dist = Math.sqrt(x * x + y * y + z * z);
      if (dist < 1000) return { x: x / 10000, y: y / 10000, z: z / 10000 };
      const logDist = Math.log10(dist / AU * 100 + 1) * 20;
      const scale = logDist / dist;
      return { x: x * scale, y: y * scale, z: z * scale };
    }
  }, [scaleMode, AU]);

  const scaleRadius = useCallback((radius, gm) => {
    const minSize = 0.5;
    const maxSize = 5;
    const logRadius = Math.log10(radius + 1);
    const logSolarRadius = Math.log10(SOLAR_RADIUS);
    const logEarthRadius = Math.log10(EARTH_RADIUS_MEAN);
    const normalized = (logRadius - logEarthRadius) / (logSolarRadius - logEarthRadius);
    const scaled = minSize + normalized * (maxSize - minSize);
    return Math.max(minSize, Math.min(maxSize, scaled));
  }, [SOLAR_RADIUS, EARTH_RADIUS_MEAN]);

  const getRetardedPosition = useCallback((targetBody, observerBody, c, currentTime) => {
    const history = targetBody.positionHistory;
    if (!history || history.count < 2 || !physicsConfig.retardedGravity) {
      return { x: targetBody.x, y: targetBody.y, z: targetBody.z };
    }

    const dx = targetBody.x - observerBody.x;
    const dy = targetBody.y - observerBody.y;
    const dz = targetBody.z - observerBody.z;
    const currentDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const lightTravelTime = currentDist / c;
    const retardedTime = currentTime - lightTravelTime;

    const firstIdx = ringBufferGetIndex(history, 0);
    const lastIdx = ringBufferGetIndex(history, history.count - 1);
    
    const firstT = history.t[firstIdx];
    const lastT = history.t[lastIdx];
    
    if (retardedTime <= firstT) {
      return { x: history.x[firstIdx], y: history.y[firstIdx], z: history.z[firstIdx] };
    }
    if (retardedTime >= lastT) {
      return { x: targetBody.x, y: targetBody.y, z: targetBody.z };
    }

    let lo = 0, hi = history.count - 1;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      const midIdx = ringBufferGetIndex(history, mid);
      if (history.t[midIdx] < retardedTime) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const loIdx = ringBufferGetIndex(history, lo);
    const hiIdx = ringBufferGetIndex(history, hi);
    
    const t0 = history.t[loIdx];
    const t1 = history.t[hiIdx];
    const dt = t1 - t0;
    
    if (dt < 1e-20) {
      return { x: history.x[loIdx], y: history.y[loIdx], z: history.z[loIdx] };
    }
    
    const t = (retardedTime - t0) / dt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    const h00 = 2*t3 - 3*t2 + 1;
    const h10 = t3 - 2*t2 + t;
    const h01 = -2*t3 + 3*t2;
    const h11 = t3 - t2;
    
    const v0x = history.vx[loIdx] * dt;
    const v0y = history.vy[loIdx] * dt;
    const v0z = history.vz[loIdx] * dt;
    const v1x = history.vx[hiIdx] * dt;
    const v1y = history.vy[hiIdx] * dt;
    const v1z = history.vz[hiIdx] * dt;

    return {
      x: h00 * history.x[loIdx] + h10 * v0x + h01 * history.x[hiIdx] + h11 * v1x,
      y: h00 * history.y[loIdx] + h10 * v0y + h01 * history.y[hiIdx] + h11 * v1y,
      z: h00 * history.z[loIdx] + h10 * v0z + h01 * history.z[hiIdx] + h11 * v1z
    };
  }, [physicsConfig.retardedGravity, ringBufferGetIndex]);

  const computeGravitationalPotentials = useCallback((bodyStates) => {
    const n = bodyStates.length;
    const potentials = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = bodyStates[j].x - bodyStates[i].x;
        const dy = bodyStates[j].y - bodyStates[i].y;
        const dz = bodyStates[j].z - bodyStates[i].z;
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (r > 0) {
          potentials[i] += bodyStates[j].gm / r;
        }
      }
    }
    return potentials;
  }, []);

  const computeJ2Acceleration = useCallback((bodyI, bodyJ, dx, dy, dz, r) => {
    if (!bodyJ.j2 || bodyJ.j2 === 0 || !bodyJ.radius) {
      return { ax: 0, ay: 0, az: 0, torqueX: 0, torqueY: 0, torqueZ: 0 };
    }
    const spinAxis = {
      x: bodyJ.spinAxisX || 0,
      y: bodyJ.spinAxisY || 0,
      z: bodyJ.spinAxisZ || 1
    };
    const spinMag = Math.sqrt(spinAxis.x * spinAxis.x + spinAxis.y * spinAxis.y + spinAxis.z * spinAxis.z);
    if (spinMag < 1e-10) {
      return { ax: 0, ay: 0, az: 0, torqueX: 0, torqueY: 0, torqueZ: 0 };
    }
    const sHat = {
      x: spinAxis.x / spinMag,
      y: spinAxis.y / spinMag,
      z: spinAxis.z / spinMag
    };
    const zPrime = dx * sHat.x + dy * sHat.y + dz * sHat.z;
    const rSq = r * r;
    const r5 = rSq * rSq * r;
    const Re = bodyJ.j2Radius || bodyJ.radius;
    const Re2 = Re * Re;
    const j2Val = Math.abs(bodyJ.j2);
    const factor = 1.5 * j2Val * bodyJ.gm * Re2 / r5;
    const zPrime2_over_rSq = (zPrime * zPrime) / rSq;
    const coeff1 = 5.0 * zPrime2_over_rSq - 1.0;
    const coeff2 = -2.0 * zPrime;
    const ax = factor * (coeff1 * dx + coeff2 * sHat.x);
    const ay = factor * (coeff1 * dy + coeff2 * sHat.y);
    const az = factor * (coeff1 * dz + coeff2 * sHat.z);
    const massI = bodyI.gm / G_CODATA;
    const Fx = massI * ax;
    const Fy = massI * ay;
    const Fz = massI * az;
    const torqueX = dy * Fz - dz * Fy;
    const torqueY = dz * Fx - dx * Fz;
    const torqueZ = dx * Fy - dy * Fx;
    return { ax, ay, az, torqueX: -torqueX, torqueY: -torqueY, torqueZ: -torqueZ };
  }, [G_CODATA]);

  const checkPNValidity = useCallback((bodyStates, scale = null) => {
    const warnings = [];
    const n = bodyStates.length;
    const effectiveC = scale ? scale.c : getEffectiveSpeedOfLight();
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = bodyStates[j].x - bodyStates[i].x;
        const dy = bodyStates[j].y - bodyStates[i].y;
        const dz = bodyStates[j].z - bodyStates[i].z;
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const dvx = bodyStates[j].vx - bodyStates[i].vx;
        const dvy = bodyStates[j].vy - bodyStates[i].vy;
        const dvz = bodyStates[j].vz - bodyStates[i].vz;
        const vRel = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
        
        const vOverC = vRel / effectiveC;
        if (vOverC > 0.1) {
          warnings.push({
            type: 'velocity',
            bodies: [bodyStates[i].name, bodyStates[j].name],
            value: vOverC,
            message: `v/c = ${(vOverC * 100).toFixed(1)}% - PN expansion inaccurate`
          });
        }
        
        const totalGM = bodyStates[i].gm + bodyStates[j].gm;
        const schwarzschildRadius = 2 * totalGM / (effectiveC * effectiveC);
        const rOverRs = r / schwarzschildRadius;
        
        if (rOverRs < 10) {
          warnings.push({
            type: 'separation',
            bodies: [bodyStates[i].name, bodyStates[j].name],
            value: rOverRs,
            message: `r/r_s = ${rOverRs.toFixed(1)} - Strong field regime, PN invalid`
          });
        }
      }
    }
    
    return warnings;
  }, [getEffectiveSpeedOfLight]);

  const computeForces = useCallback((bodyStates, options = {}) => {
    const {
      includeGR = false,
      grMode = '1pn',
      includeJ2 = false,
      j2BackReaction = true,
      softeningConfig: sConf = { enabled: false },
      scale = null,
      currentTime = 0
    } = options;
    const n = bodyStates.length;
    const accelerations = new Array(n).fill(0).map(() => ({ x: 0, y: 0, z: 0 }));
    const jerks = new Array(n).fill(0).map(() => ({ x: 0, y: 0, z: 0 }));
    const spinTorques = new Array(n).fill(0).map(() => ({ x: 0, y: 0, z: 0 }));

    const softenings = sConf.enabled ? calculateSoftening(bodyStates, sConf) : new Array(n).fill(0);

    const effectiveC = scale ? scale.c : getEffectiveSpeedOfLight();
    const c = effectiveC;
    const c2 = c * c;
    const c5 = c2 * c2 * c;

    const useRetardedPositions = physicsConfig.relativisticMode && physicsConfig.retardedGravity && includeGR;

    const rVecs = [];
    const rMags = [];
    const invRMags = [];
    for (let i = 0; i < n; i++) {
      rVecs[i] = [];
      rMags[i] = [];
      invRMags[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          rVecs[i][j] = { x: 0, y: 0, z: 0 };
          rMags[i][j] = 0;
          invRMags[i][j] = 0;
        } else {
          let posJ;
          if (useRetardedPositions) {
            posJ = getRetardedPosition(bodyStates[j], bodyStates[i], c, currentTime);
          } else {
            posJ = { x: bodyStates[j].x, y: bodyStates[j].y, z: bodyStates[j].z };
          }
          const dx = posJ.x - bodyStates[i].x;
          const dy = posJ.y - bodyStates[i].y;
          const dz = posJ.z - bodyStates[i].z;
          const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
          rVecs[i][j] = { x: dx, y: dy, z: dz };
          rMags[i][j] = r;
          invRMags[i][j] = r > 0 ? 1.0 / r : 0;
        }
      }
    }

    let potentials = null;
    if (includeGR) {
      potentials = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j && rMags[i][j] > 0) {
            potentials[i] += bodyStates[j].gm / rMags[i][j];
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const iIsDebris = bodyStates[i].isDebris;
        const jIsDebris = bodyStates[j].isDebris;
        
        if (iIsDebris && jIsDebris) continue;
        
        const dx = rVecs[i][j].x;
        const dy = rVecs[i][j].y;
        const dz = rVecs[i][j].z;
        const r = rMags[i][j];
        const invR = invRMags[i][j];
        const rSq = r * r;
        const invR3 = invR * invR * invR;

        let forceMod = 1.0;
        if (sConf.enabled) {
          const eps = symmetricSoftening(softenings[i], softenings[j]);
          const adaptiveThreshold = 10.0 * eps;
          if (r > adaptiveThreshold) {
            forceMod = 1.0;
          } else if (sConf.mode === 'plummer') {
            forceMod = softeningKernels.plummer.forceMod(r, eps);
          } else if (sConf.mode === 'spline') {
            forceMod = softeningKernels.spline.forceMod(r, eps);
          } else if (sConf.mode === 'wendlandC2') {
            forceMod = softeningKernels.wendlandC2.forceMod(r, eps);
          }
        }

        const GMj = bodyStates[j].gm;
        const GMi = bodyStates[i].gm;

        const effectiveInvR3 = invR3 * forceMod;

        let aij_x = 0, aij_y = 0, aij_z = 0;
        let aji_x = 0, aji_y = 0, aji_z = 0;
        
        if (!jIsDebris) {
          aij_x = GMj * effectiveInvR3 * dx;
          aij_y = GMj * effectiveInvR3 * dy;
          aij_z = GMj * effectiveInvR3 * dz;
        }

        if (!iIsDebris) {
          aji_x = GMi * effectiveInvR3 * dx;
          aji_y = GMi * effectiveInvR3 * dy;
          aji_z = GMi * effectiveInvR3 * dz;
        }

        if (includeGR && r > 0 && !iIsDebris && !jIsDebris) {
          const totalGM = GMi + GMj;
          const schwarzschildRadius = 2 * totalGM / c2;
          const pnValid = r > 10 * schwarzschildRadius;
          
          if (pnValid) {
            const nhat = { x: dx * invR, y: dy * invR, z: dz * invR };
            const vA = { x: bodyStates[i].vx, y: bodyStates[i].vy, z: bodyStates[i].vz };
            const vB = { x: bodyStates[j].vx, y: bodyStates[j].vy, z: bodyStates[j].vz };
            const vA2 = vA.x * vA.x + vA.y * vA.y + vA.z * vA.z;
            const vB2 = vB.x * vB.x + vB.y * vB.y + vB.z * vB.z;
            const vAdotvB = vA.x * vB.x + vA.y * vB.y + vA.z * vB.z;
            const nDotvB = nhat.x * vB.x + nhat.y * vB.y + nhat.z * vB.z;
            const nDotvA = nhat.x * vA.x + nhat.y * vA.y + nhat.z * vA.z;

            const sumPhi_A_others = potentials[i];
            const sumPhi_B_others = potentials[j];

            const potentialTermA = -5.0 * sumPhi_A_others - 4.0 * sumPhi_B_others;
            const potentialTermB = -5.0 * sumPhi_B_others - 4.0 * sumPhi_A_others;

            const eihScalarA = (1.0 / c2) * (
              vA2 + 2.0 * vB2 - 4.0 * vAdotvB
              - 1.5 * nDotvB * nDotvB
              + potentialTermA
            );

            const dvAB_x = vA.x - vB.x;
            const dvAB_y = vA.y - vB.y;
            const dvAB_z = vA.z - vB.z;

            const eihVecCoeffA = (1.0 / c2) * (4.0 * nDotvA - 3.0 * nDotvB);

            const grCorrA_x = aij_x * eihScalarA + (GMj * invR * invR / c2) * eihVecCoeffA * dvAB_x;
            const grCorrA_y = aij_y * eihScalarA + (GMj * invR * invR / c2) * eihVecCoeffA * dvAB_y;
            const grCorrA_z = aij_z * eihScalarA + (GMj * invR * invR / c2) * eihVecCoeffA * dvAB_z;

            aij_x += grCorrA_x;
            aij_y += grCorrA_y;
            aij_z += grCorrA_z;

            const eihScalarB = (1.0 / c2) * (
              vB2 + 2.0 * vA2 - 4.0 * vAdotvB
              - 1.5 * nDotvA * nDotvA
              + potentialTermB
            );

            const eihVecCoeffB = (1.0 / c2) * (4.0 * nDotvB - 3.0 * nDotvA);

            const grCorrB_x = aji_x * eihScalarB - (GMi * invR * invR / c2) * eihVecCoeffB * dvAB_x;
            const grCorrB_y = aji_y * eihScalarB - (GMi * invR * invR / c2) * eihVecCoeffB * dvAB_y;
            const grCorrB_z = aji_z * eihScalarB - (GMi * invR * invR / c2) * eihVecCoeffB * dvAB_z;

            aji_x += grCorrB_x;
            aji_y += grCorrB_y;
            aji_z += grCorrB_z;

            if (grMode === '2.5pn' && r > 20 * schwarzschildRadius && !physicsConfig.retardedGravity) {
              const mi = GMi / (scale ? 1 : G_CODATA);
              const mj = GMj / (scale ? 1 : G_CODATA);
              const totalMass = mi + mj;
              const reducedMass = (mi * mj) / totalMass;
              const eta = reducedMass / totalMass;
              const vRel_x = vA.x - vB.x;
              const vRel_y = vA.y - vB.y;
              const vRel_z = vA.z - vB.z;
              const vRelSq = vRel_x * vRel_x + vRel_y * vRel_y + vRel_z * vRel_z;
              const rdot = nhat.x * vRel_x + nhat.y * vRel_y + nhat.z * vRel_z;
              const GTotal = scale ? 1 : G_CODATA;
              const prefactor = (8.0 / 5.0) * eta * GTotal * totalMass / (r * c5);
              const radialCoeff = prefactor * rdot * (
                (17.0 / 3.0) * GTotal * totalMass / r + 3.0 * vRelSq
              );
              const tangentCoeff = -prefactor * (
                3.0 * GTotal * totalMass / r + vRelSq
              );
              const rr_x = radialCoeff * nhat.x + tangentCoeff * vRel_x;
              const rr_y = radialCoeff * nhat.y + tangentCoeff * vRel_y;
              const rr_z = radialCoeff * nhat.z + tangentCoeff * vRel_z;
              const massRatioI = mj / totalMass;
              const massRatioJ = mi / totalMass;
              aij_x += rr_x * massRatioI;
              aij_y += rr_y * massRatioI;
              aij_z += rr_z * massRatioI;
              aji_x -= rr_x * massRatioJ;
              aji_y -= rr_y * massRatioJ;
              aji_z -= rr_z * massRatioJ;
            }
          }
        }

        if (includeJ2 && r > 0 && !iIsDebris && !jIsDebris) {
          const j2ResultFromJ = computeJ2Acceleration(bodyStates[i], bodyStates[j], -dx, -dy, -dz, r);
          aij_x += j2ResultFromJ.ax;
          aij_y += j2ResultFromJ.ay;
          aij_z += j2ResultFromJ.az;
          if (j2BackReaction) {
            spinTorques[j].x += j2ResultFromJ.torqueX;
            spinTorques[j].y += j2ResultFromJ.torqueY;
            spinTorques[j].z += j2ResultFromJ.torqueZ;
          }

          const j2ResultFromI = computeJ2Acceleration(bodyStates[j], bodyStates[i], dx, dy, dz, r);
          aji_x += j2ResultFromI.ax;
          aji_y += j2ResultFromI.ay;
          aji_z += j2ResultFromI.az;
          if (j2BackReaction) {
            spinTorques[i].x += j2ResultFromI.torqueX;
            spinTorques[i].y += j2ResultFromI.torqueY;
            spinTorques[i].z += j2ResultFromI.torqueZ;
          }
        }

        accelerations[i].x += aij_x;
        accelerations[i].y += aij_y;
        accelerations[i].z += aij_z;
        accelerations[j].x -= aji_x;
        accelerations[j].y -= aji_y;
        accelerations[j].z -= aji_z;

        const dvx = bodyStates[j].vx - bodyStates[i].vx;
        const dvy = bodyStates[j].vy - bodyStates[i].vy;
        const dvz = bodyStates[j].vz - bodyStates[i].vz;
        const rDotv = dx * dvx + dy * dvy + dz * dvz;

        let jerkInvR3 = invR3;
        if (sConf.enabled && r > 0) {
          const eps = symmetricSoftening(softenings[i], softenings[j]);
          if (sConf.mode === 'plummer') {
            const r2 = r * r;
            const eps2 = eps * eps;
            const denom = r2 + eps2;
            jerkInvR3 = 1.0 / Math.pow(denom, 1.5);
          } else if (sConf.mode === 'spline' || sConf.mode === 'wendlandC2') {
            jerkInvR3 = effectiveInvR3;
          }
        }

        const alpha = 3 * rDotv / rSq;
        
        if (!jIsDebris) {
          const termJ = GMj * jerkInvR3;
          jerks[i].x += termJ * (dvx - alpha * dx);
          jerks[i].y += termJ * (dvy - alpha * dy);
          jerks[i].z += termJ * (dvz - alpha * dz);
        }

        if (!iIsDebris) {
          const termI = GMi * jerkInvR3;
          jerks[j].x += termI * (-dvx - alpha * (-dx));
          jerks[j].y += termI * (-dvy - alpha * (-dy));
          jerks[j].z += termI * (-dvz - alpha * (-dz));
        }
      }
    }
    return { accelerations, jerks, spinTorques };
  }, [calculateSoftening, symmetricSoftening, softeningKernels, getEffectiveSpeedOfLight, computeJ2Acceleration, G_CODATA, physicsConfig.relativisticMode, physicsConfig.retardedGravity, getRetardedPosition]);

  const computeSnap = useCallback((bodyStates, accelerations, jerks) => {
    const n = bodyStates.length;
    const snaps = new Array(n).fill(0).map(() => ({ x: 0, y: 0, z: 0 }));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const iIsDebris = bodyStates[i].isDebris;
        const jIsDebris = bodyStates[j].isDebris;
        
        if (iIsDebris && jIsDebris) continue;
        
        const dx = bodyStates[j].x - bodyStates[i].x;
        const dy = bodyStates[j].y - bodyStates[i].y;
        const dz = bodyStates[j].z - bodyStates[i].z;
        const rSq = dx * dx + dy * dy + dz * dz;
        const r = Math.sqrt(rSq);
        const invR = 1.0 / r;
        const invR3 = invR * invR * invR;

        const dvx = bodyStates[j].vx - bodyStates[i].vx;
        const dvy = bodyStates[j].vy - bodyStates[i].vy;
        const dvz = bodyStates[j].vz - bodyStates[i].vz;

        const dax = accelerations[j].x - accelerations[i].x;
        const day = accelerations[j].y - accelerations[i].y;
        const daz = accelerations[j].z - accelerations[i].z;

        const rDotv = dx * dvx + dy * dvy + dz * dvz;
        const rDota = dx * dax + dy * day + dz * daz;
        const vDotv = dvx * dvx + dvy * dvy + dvz * dvz;

        const GMj = bodyStates[j].gm;
        const GMi = bodyStates[i].gm;

        const alpha = rDotv / rSq;
        const beta = (vDotv + rDota) / rSq + alpha * alpha;

        if (!jIsDebris) {
          const snap_ij_x = GMj * invR3 * (dax - 6.0 * alpha * (dvx - alpha * dx) - 3.0 * beta * dx);
          const snap_ij_y = GMj * invR3 * (day - 6.0 * alpha * (dvy - alpha * dy) - 3.0 * beta * dy);
          const snap_ij_z = GMj * invR3 * (daz - 6.0 * alpha * (dvz - alpha * dz) - 3.0 * beta * dz);
          snaps[i].x += snap_ij_x;
          snaps[i].y += snap_ij_y;
          snaps[i].z += snap_ij_z;
        }

        if (!iIsDebris) {
          const snap_ji_x = GMi * invR3 * (-dax - 6.0 * alpha * (-dvx - alpha * (-dx)) - 3.0 * beta * (-dx));
          const snap_ji_y = GMi * invR3 * (-day - 6.0 * alpha * (-dvy - alpha * (-dy)) - 3.0 * beta * (-dy));
          const snap_ji_z = GMi * invR3 * (-daz - 6.0 * alpha * (-dvz - alpha * (-dz)) - 3.0 * beta * (-dz));
          snaps[j].x += snap_ji_x;
          snaps[j].y += snap_ji_y;
          snaps[j].z += snap_ji_z;
        }
      }
    }
    return snaps;
  }, []);

  const computeAdaptiveTimestep = useCallback((bodyStates, baseTimestep, options = {}) => {
    const { eta = 0.02, method = 'aarseth', maxTimestep = baseTimestep * 10, scale = null } = options;
    if (bodyStates.length < 2) return baseTimestep;
    let dt = maxTimestep;

    const forceOptions = {
      softeningConfig,
      includeGR: physicsConfig.includeGR,
      grMode: physicsConfig.grMode,
      includeJ2: physicsConfig.includeJ2,
      j2BackReaction: physicsConfig.j2BackReaction,
      scale: scale
    };

    if (method === 'simple') {
      for (let i = 0; i < bodyStates.length; i++) {
        for (let j = i + 1; j < bodyStates.length; j++) {
          const dx = bodyStates[j].x - bodyStates[i].x;
          const dy = bodyStates[j].y - bodyStates[i].y;
          const dz = bodyStates[j].z - bodyStates[i].z;
          const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const dvx = bodyStates[j].vx - bodyStates[i].vx;
          const dvy = bodyStates[j].vy - bodyStates[i].vy;
          const dvz = bodyStates[j].vz - bodyStates[i].vz;
          const vRel = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
          if (vRel > 0) dt = Math.min(dt, eta * r / vRel);
          const mu = bodyStates[i].gm + bodyStates[j].gm;
          if (r > 0 && mu > 0) {
            const tOrb = 2 * Math.PI * Math.sqrt(r * r * r / mu);
            dt = Math.min(dt, eta * tOrb);
          }
        }
      }
    } else if (method === 'aarseth') {
      const { accelerations, jerks } = computeForces(bodyStates, forceOptions);

      for (let i = 0; i < bodyStates.length; i++) {
        const a2 = accelerations[i].x ** 2 + accelerations[i].y ** 2 + accelerations[i].z ** 2;
        const j2 = jerks[i].x ** 2 + jerks[i].y ** 2 + jerks[i].z ** 2;

        const aMag = Math.sqrt(a2);
        const jMag = Math.sqrt(j2);

        if (jMag > 1e-30 && aMag > 1e-30) {
          dt = Math.min(dt, eta * Math.sqrt(aMag / jMag));
        } else if (aMag > 1e-30) {
          const v = Math.sqrt(bodyStates[i].vx ** 2 + bodyStates[i].vy ** 2 + bodyStates[i].vz ** 2);
          if (v > 1e-30) {
            dt = Math.min(dt, eta * v / aMag);
          }
        }
      }
    } else if (method === 'higherorder') {
      const { accelerations, jerks } = computeForces(bodyStates, forceOptions);
      const snaps = computeSnap(bodyStates, accelerations, jerks);

      for (let i = 0; i < bodyStates.length; i++) {
        const a2 = accelerations[i].x ** 2 + accelerations[i].y ** 2 + accelerations[i].z ** 2;
        const j2 = jerks[i].x ** 2 + jerks[i].y ** 2 + jerks[i].z ** 2;
        const s2 = snaps[i].x ** 2 + snaps[i].y ** 2 + snaps[i].z ** 2;

        const aMag = Math.sqrt(a2);
        const jMag = Math.sqrt(j2);
        const sMag = Math.sqrt(s2);

        if (jMag > 1e-30 && sMag > 1e-30) {
          const numerator = aMag * sMag + jMag * jMag;
          const denominator = jMag * sMag + sMag * sMag + 1e-30;
          dt = Math.min(dt, eta * Math.sqrt(numerator / denominator));
        } else if (jMag > 1e-30 && aMag > 1e-30) {
          dt = Math.min(dt, eta * Math.sqrt(aMag / jMag));
        } else if (aMag > 1e-30) {
          const v = Math.sqrt(bodyStates[i].vx ** 2 + bodyStates[i].vy ** 2 + bodyStates[i].vz ** 2);
          if (v > 1e-30) {
            dt = Math.min(dt, eta * v / aMag);
          }
        }
      }
    }
    return Math.min(maxTimestep, dt);
  }, [computeForces, computeSnap, softeningConfig, physicsConfig]);

  const kahanSum = (current, input, error) => {
    const y = input - error;
    const t = current + y;
    const newError = (t - current) - y;
    return { value: t, error: newError };
  };

  const computeInertiaTensor = useCallback((body, scale) => {
    const mass = body.gm / (scale ? 1 : G_CODATA);
    const radius = body.j2Radius || body.radius;
    const moiFactor = body.momentOfInertiaFactor || 0.4;
    const j2 = body.j2 || 0;
    const MR2 = mass * radius * radius;
    const I_mean = moiFactor * MR2;
    const I_xx = I_mean - (j2 * MR2) / 3;
    const I_yy = I_xx;
    const I_zz = I_mean + (2 * j2 * MR2) / 3;
    return { I_xx, I_yy, I_zz };
  }, [G_CODATA]);

  const quaternionMultiply = useCallback((q1, q2) => {
    return {
      w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
      x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
      y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
      z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w
    };
  }, []);

  const quaternionNormalize = useCallback((q) => {
    const mag = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
    if (mag < 1e-10) return { w: 1, x: 0, y: 0, z: 0 };
    return { w: q.w / mag, x: q.x / mag, y: q.y / mag, z: q.z / mag };
  }, []);

  const quaternionConjugate = useCallback((q) => {
    return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
  }, []);

  const rotateVectorByQuaternion = useCallback((v, q) => {
    const qv = { w: 0, x: v.x, y: v.y, z: v.z };
    const qConj = quaternionConjugate(q);
    const result = quaternionMultiply(quaternionMultiply(q, qv), qConj);
    return { x: result.x, y: result.y, z: result.z };
  }, [quaternionMultiply, quaternionConjugate]);

  const spinAxisToQuaternion = useCallback((spinAxisX, spinAxisY, spinAxisZ) => {
    const mag = Math.sqrt(spinAxisX * spinAxisX + spinAxisY * spinAxisY + spinAxisZ * spinAxisZ);
    if (mag < 1e-10) return { w: 1, x: 0, y: 0, z: 0 };
    const nx = spinAxisX / mag;
    const ny = spinAxisY / mag;
    const nz = spinAxisZ / mag;
    const refZ = { x: 0, y: 0, z: 1 };
    const dot = nz;
    if (dot > 0.9999) return { w: 1, x: 0, y: 0, z: 0 };
    if (dot < -0.9999) return { w: 0, x: 1, y: 0, z: 0 };
    const crossX = refZ.y * nz - refZ.z * ny;
    const crossY = refZ.z * nx - refZ.x * nz;
    const crossZ = refZ.x * ny - refZ.y * nx;
    const crossMag = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    const halfAngle = angle / 2;
    const sinHalf = Math.sin(halfAngle);
    return quaternionNormalize({
      w: Math.cos(halfAngle),
      x: (crossX / crossMag) * sinHalf,
      y: (crossY / crossMag) * sinHalf,
      z: (crossZ / crossMag) * sinHalf
    });
  }, [quaternionNormalize]);

  const quaternionToSpinAxis = useCallback((q) => {
    const bodyZ = rotateVectorByQuaternion({ x: 0, y: 0, z: 1 }, q);
    const mag = Math.sqrt(bodyZ.x * bodyZ.x + bodyZ.y * bodyZ.y + bodyZ.z * bodyZ.z);
    if (mag < 1e-10) return { x: 0, y: 0, z: 1 };
    return { x: bodyZ.x / mag, y: bodyZ.y / mag, z: bodyZ.z / mag };
  }, [rotateVectorByQuaternion]);

  const integrateRK5 = useCallback((bodyStates, dt, scale = null, currentTime = 0) => {
    const forceOptions = {
      softeningConfig,
      includeGR: physicsConfig.includeGR,
      grMode: physicsConfig.grMode,
      includeJ2: physicsConfig.includeJ2,
      j2BackReaction: physicsConfig.j2BackReaction,
      scale: scale,
      currentTime: currentTime
    };

    const getDerivatives = (states, t) => {
      const opts = { ...forceOptions, currentTime: t };
      const { accelerations, spinTorques } = computeForces(states, opts);
      return states.map((s, i) => {
        let dqw = 0, dqx = 0, dqy = 0, dqz = 0;
        let dOmega = 0;
        if (physicsConfig.includeJ2 && physicsConfig.j2BackReaction && s.j2 && s.spinRate) {
          const torqueInertial = { x: spinTorques[i].x, y: spinTorques[i].y, z: spinTorques[i].z };
          const { I_xx, I_yy, I_zz } = computeInertiaTensor(s, scale);
          const q = s.orientation || spinAxisToQuaternion(s.spinAxisX || 0, s.spinAxisY || 0, s.spinAxisZ || 1);
          const qConj = quaternionConjugate(q);
          const torqueBody = rotateVectorByQuaternion(torqueInertial, qConj);
          const omega_z = s.spinRate || 0;
          const omega_x = s.omegaBody_x || 0;
          const omega_y = s.omegaBody_y || 0;
          const eulerTerm_x = (I_yy - I_zz) * omega_y * omega_z;
          const eulerTerm_y = (I_zz - I_xx) * omega_z * omega_x;
          const eulerTerm_z = (I_xx - I_yy) * omega_x * omega_y;
          const omegaDot_x = I_xx > 1e-30 ? (torqueBody.x - eulerTerm_x) / I_xx : 0;
          const omegaDot_y = I_yy > 1e-30 ? (torqueBody.y - eulerTerm_y) / I_yy : 0;
          const omegaDot_z = I_zz > 1e-30 ? (torqueBody.z - eulerTerm_z) / I_zz : 0;
          const omegaQuat = { w: 0, x: omega_x / 2, y: omega_y / 2, z: omega_z / 2 };
          const qDot = quaternionMultiply(q, omegaQuat);
          dqw = qDot.w;
          dqx = qDot.x;
          dqy = qDot.y;
          dqz = qDot.z;
          dOmega = omegaDot_z;
          return {
            dx: s.vx, dy: s.vy, dz: s.vz,
            dvx: accelerations[i].x, dvy: accelerations[i].y, dvz: accelerations[i].z,
            dqw, dqx, dqy, dqz,
            dOmegaX: omegaDot_x, dOmegaY: omegaDot_y, dOmegaZ: omegaDot_z
          };
        }
        return {
          dx: s.vx, dy: s.vy, dz: s.vz,
          dvx: accelerations[i].x, dvy: accelerations[i].y, dvz: accelerations[i].z,
          dqw: 0, dqx: 0, dqy: 0, dqz: 0,
          dOmegaX: 0, dOmegaY: 0, dOmegaZ: 0
        };
      });
    };

    const b2 = 1 / 4;
    const b3 = 3 / 32, c3 = 9 / 32;
    const b4 = 1932 / 2197, c4 = -7200 / 2197, d4 = 7296 / 2197;
    const b5 = 439 / 216, c5 = -8, d5 = 3680 / 513, e5 = -845 / 4104;
    const b6 = -8 / 27, c6 = 2, d6 = -3544 / 2565, e6 = 1859 / 4104, f6 = -11 / 40;
    const n1 = 16 / 135, n3 = 6656 / 12825, n4 = 28561 / 56430, n5 = -9 / 50, n6 = 2 / 55;

    const prepState = bodyStates.map(b => {
      if (!b.orientation && physicsConfig.includeJ2 && b.j2) {
        return { ...b, orientation: spinAxisToQuaternion(b.spinAxisX || 0, b.spinAxisY || 0, b.spinAxisZ || 1), omegaBody_x: 0, omegaBody_y: 0 };
      }
      return { ...b, omegaBody_x: b.omegaBody_x || 0, omegaBody_y: b.omegaBody_y || 0 };
    });

    const k1 = getDerivatives(prepState, currentTime);

    const s2 = prepState.map((b, i) => {
      const q = b.orientation || { w: 1, x: 0, y: 0, z: 0 };
      return {
        ...b,
        x: b.x + b2 * k1[i].dx * dt,
        y: b.y + b2 * k1[i].dy * dt,
        z: b.z + b2 * k1[i].dz * dt,
        vx: b.vx + b2 * k1[i].dvx * dt,
        vy: b.vy + b2 * k1[i].dvy * dt,
        vz: b.vz + b2 * k1[i].dvz * dt,
        orientation: quaternionNormalize({ w: q.w + b2 * k1[i].dqw * dt, x: q.x + b2 * k1[i].dqx * dt, y: q.y + b2 * k1[i].dqy * dt, z: q.z + b2 * k1[i].dqz * dt }),
        omegaBody_x: (b.omegaBody_x || 0) + b2 * k1[i].dOmegaX * dt,
        omegaBody_y: (b.omegaBody_y || 0) + b2 * k1[i].dOmegaY * dt,
        spinRate: (b.spinRate || 0) + b2 * k1[i].dOmegaZ * dt
      };
    });
    const k2 = getDerivatives(s2, currentTime + b2 * dt);

    const s3 = prepState.map((b, i) => {
      const q = b.orientation || { w: 1, x: 0, y: 0, z: 0 };
      return {
        ...b,
        x: b.x + (b3 * k1[i].dx + c3 * k2[i].dx) * dt,
        y: b.y + (b3 * k1[i].dy + c3 * k2[i].dy) * dt,
        z: b.z + (b3 * k1[i].dz + c3 * k2[i].dz) * dt,
        vx: b.vx + (b3 * k1[i].dvx + c3 * k2[i].dvx) * dt,
        vy: b.vy + (b3 * k1[i].dvy + c3 * k2[i].dvy) * dt,
        vz: b.vz + (b3 * k1[i].dvz + c3 * k2[i].dvz) * dt,
        orientation: quaternionNormalize({ w: q.w + (b3 * k1[i].dqw + c3 * k2[i].dqw) * dt, x: q.x + (b3 * k1[i].dqx + c3 * k2[i].dqx) * dt, y: q.y + (b3 * k1[i].dqy + c3 * k2[i].dqy) * dt, z: q.z + (b3 * k1[i].dqz + c3 * k2[i].dqz) * dt }),
        omegaBody_x: (b.omegaBody_x || 0) + (b3 * k1[i].dOmegaX + c3 * k2[i].dOmegaX) * dt,
        omegaBody_y: (b.omegaBody_y || 0) + (b3 * k1[i].dOmegaY + c3 * k2[i].dOmegaY) * dt,
        spinRate: (b.spinRate || 0) + (b3 * k1[i].dOmegaZ + c3 * k2[i].dOmegaZ) * dt
      };
    });
    const k3 = getDerivatives(s3, currentTime + 0.375 * dt);

    const s4 = prepState.map((b, i) => {
      const q = b.orientation || { w: 1, x: 0, y: 0, z: 0 };
      return {
        ...b,
        x: b.x + (b4 * k1[i].dx + c4 * k2[i].dx + d4 * k3[i].dx) * dt,
        y: b.y + (b4 * k1[i].dy + c4 * k2[i].dy + d4 * k3[i].dy) * dt,
        z: b.z + (b4 * k1[i].dz + c4 * k2[i].dz + d4 * k3[i].dz) * dt,
        vx: b.vx + (b4 * k1[i].dvx + c4 * k2[i].dvx + d4 * k3[i].dvx) * dt,
        vy: b.vy + (b4 * k1[i].dvy + c4 * k2[i].dvy + d4 * k3[i].dvy) * dt,
        vz: b.vz + (b4 * k1[i].dvz + c4 * k2[i].dvz + d4 * k3[i].dvz) * dt,
        orientation: quaternionNormalize({ w: q.w + (b4 * k1[i].dqw + c4 * k2[i].dqw + d4 * k3[i].dqw) * dt, x: q.x + (b4 * k1[i].dqx + c4 * k2[i].dqx + d4 * k3[i].dqx) * dt, y: q.y + (b4 * k1[i].dqy + c4 * k2[i].dqy + d4 * k3[i].dqy) * dt, z: q.z + (b4 * k1[i].dqz + c4 * k2[i].dqz + d4 * k3[i].dqz) * dt }),
        omegaBody_x: (b.omegaBody_x || 0) + (b4 * k1[i].dOmegaX + c4 * k2[i].dOmegaX + d4 * k3[i].dOmegaX) * dt,
        omegaBody_y: (b.omegaBody_y || 0) + (b4 * k1[i].dOmegaY + c4 * k2[i].dOmegaY + d4 * k3[i].dOmegaY) * dt,
        spinRate: (b.spinRate || 0) + (b4 * k1[i].dOmegaZ + c4 * k2[i].dOmegaZ + d4 * k3[i].dOmegaZ) * dt
      };
    });
    const k4 = getDerivatives(s4, currentTime + (12/13) * dt);

    const s5 = prepState.map((b, i) => {
      const q = b.orientation || { w: 1, x: 0, y: 0, z: 0 };
      return {
        ...b,
        x: b.x + (b5 * k1[i].dx + c5 * k2[i].dx + d5 * k3[i].dx + e5 * k4[i].dx) * dt,
        y: b.y + (b5 * k1[i].dy + c5 * k2[i].dy + d5 * k3[i].dy + e5 * k4[i].dy) * dt,
        z: b.z + (b5 * k1[i].dz + c5 * k2[i].dz + d5 * k3[i].dz + e5 * k4[i].dz) * dt,
        vx: b.vx + (b5 * k1[i].dvx + c5 * k2[i].dvx + d5 * k3[i].dvx + e5 * k4[i].dvx) * dt,
        vy: b.vy + (b5 * k1[i].dvy + c5 * k2[i].dvy + d5 * k3[i].dvy + e5 * k4[i].dvy) * dt,
        vz: b.vz + (b5 * k1[i].dvz + c5 * k2[i].dvz + d5 * k3[i].dvz + e5 * k4[i].dvz) * dt,
        orientation: quaternionNormalize({ w: q.w + (b5 * k1[i].dqw + c5 * k2[i].dqw + d5 * k3[i].dqw + e5 * k4[i].dqw) * dt, x: q.x + (b5 * k1[i].dqx + c5 * k2[i].dqx + d5 * k3[i].dqx + e5 * k4[i].dqx) * dt, y: q.y + (b5 * k1[i].dqy + c5 * k2[i].dqy + d5 * k3[i].dqy + e5 * k4[i].dqy) * dt, z: q.z + (b5 * k1[i].dqz + c5 * k2[i].dqz + d5 * k3[i].dqz + e5 * k4[i].dqz) * dt }),
        omegaBody_x: (b.omegaBody_x || 0) + (b5 * k1[i].dOmegaX + c5 * k2[i].dOmegaX + d5 * k3[i].dOmegaX + e5 * k4[i].dOmegaX) * dt,
        omegaBody_y: (b.omegaBody_y || 0) + (b5 * k1[i].dOmegaY + c5 * k2[i].dOmegaY + d5 * k3[i].dOmegaY + e5 * k4[i].dOmegaY) * dt,
        spinRate: (b.spinRate || 0) + (b5 * k1[i].dOmegaZ + c5 * k2[i].dOmegaZ + d5 * k3[i].dOmegaZ + e5 * k4[i].dOmegaZ) * dt
      };
    });
    const k5 = getDerivatives(s5, currentTime + dt);

    const s6 = prepState.map((b, i) => {
      const q = b.orientation || { w: 1, x: 0, y: 0, z: 0 };
      return {
        ...b,
        x: b.x + (b6 * k1[i].dx + c6 * k2[i].dx + d6 * k3[i].dx + e6 * k4[i].dx + f6 * k5[i].dx) * dt,
        y: b.y + (b6 * k1[i].dy + c6 * k2[i].dy + d6 * k3[i].dy + e6 * k4[i].dy + f6 * k5[i].dy) * dt,
        z: b.z + (b6 * k1[i].dz + c6 * k2[i].dz + d6 * k3[i].dz + e6 * k4[i].dz + f6 * k5[i].dz) * dt,
        vx: b.vx + (b6 * k1[i].dvx + c6 * k2[i].dvx + d6 * k3[i].dvx + e6 * k4[i].dvx + f6 * k5[i].dvx) * dt,
        vy: b.vy + (b6 * k1[i].dvy + c6 * k2[i].dvy + d6 * k3[i].dvy + e6 * k4[i].dvy + f6 * k5[i].dvy) * dt,
        vz: b.vz + (b6 * k1[i].dvz + c6 * k2[i].dvz + d6 * k3[i].dvz + e6 * k4[i].dvz + f6 * k5[i].dvz) * dt,
        orientation: quaternionNormalize({ w: q.w + (b6 * k1[i].dqw + c6 * k2[i].dqw + d6 * k3[i].dqw + e6 * k4[i].dqw + f6 * k5[i].dqw) * dt, x: q.x + (b6 * k1[i].dqx + c6 * k2[i].dqx + d6 * k3[i].dqx + e6 * k4[i].dqx + f6 * k5[i].dqx) * dt, y: q.y + (b6 * k1[i].dqy + c6 * k2[i].dqy + d6 * k3[i].dqy + e6 * k4[i].dqy + f6 * k5[i].dqy) * dt, z: q.z + (b6 * k1[i].dqz + c6 * k2[i].dqz + d6 * k3[i].dqz + e6 * k4[i].dqz + f6 * k5[i].dqz) * dt }),
        omegaBody_x: (b.omegaBody_x || 0) + (b6 * k1[i].dOmegaX + c6 * k2[i].dOmegaX + d6 * k3[i].dOmegaX + e6 * k4[i].dOmegaX + f6 * k5[i].dOmegaX) * dt,
        omegaBody_y: (b.omegaBody_y || 0) + (b6 * k1[i].dOmegaY + c6 * k2[i].dOmegaY + d6 * k3[i].dOmegaY + e6 * k4[i].dOmegaY + f6 * k5[i].dOmegaY) * dt,
        spinRate: (b.spinRate || 0) + (b6 * k1[i].dOmegaZ + c6 * k2[i].dOmegaZ + d6 * k3[i].dOmegaZ + e6 * k4[i].dOmegaZ + f6 * k5[i].dOmegaZ) * dt
      };
    });
    const k6 = getDerivatives(s6, currentTime + 0.5 * dt);

    return prepState.map((b, i) => {
      const q = b.orientation || { w: 1, x: 0, y: 0, z: 0 };
      const newQ = quaternionNormalize({
        w: q.w + (n1 * k1[i].dqw + n3 * k3[i].dqw + n4 * k4[i].dqw + n5 * k5[i].dqw + n6 * k6[i].dqw) * dt,
        x: q.x + (n1 * k1[i].dqx + n3 * k3[i].dqx + n4 * k4[i].dqx + n5 * k5[i].dqx + n6 * k6[i].dqx) * dt,
        y: q.y + (n1 * k1[i].dqy + n3 * k3[i].dqy + n4 * k4[i].dqy + n5 * k5[i].dqy + n6 * k6[i].dqy) * dt,
        z: q.z + (n1 * k1[i].dqz + n3 * k3[i].dqz + n4 * k4[i].dqz + n5 * k5[i].dqz + n6 * k6[i].dqz) * dt
      });
      const newSpinAxis = quaternionToSpinAxis(newQ);
      return {
        ...b,
        x: b.x + (n1 * k1[i].dx + n3 * k3[i].dx + n4 * k4[i].dx + n5 * k5[i].dx + n6 * k6[i].dx) * dt,
        y: b.y + (n1 * k1[i].dy + n3 * k3[i].dy + n4 * k4[i].dy + n5 * k5[i].dy + n6 * k6[i].dy) * dt,
        z: b.z + (n1 * k1[i].dz + n3 * k3[i].dz + n4 * k4[i].dz + n5 * k5[i].dz + n6 * k6[i].dz) * dt,
        vx: b.vx + (n1 * k1[i].dvx + n3 * k3[i].dvx + n4 * k4[i].dvx + n5 * k5[i].dvx + n6 * k6[i].dvx) * dt,
        vy: b.vy + (n1 * k1[i].dvy + n3 * k3[i].dvy + n4 * k4[i].dvy + n5 * k5[i].dvy + n6 * k6[i].dvy) * dt,
        vz: b.vz + (n1 * k1[i].dvz + n3 * k3[i].dvz + n4 * k4[i].dvz + n5 * k5[i].dvz + n6 * k6[i].dvz) * dt,
        orientation: newQ,
        spinAxisX: newSpinAxis.x,
        spinAxisY: newSpinAxis.y,
        spinAxisZ: newSpinAxis.z,
        omegaBody_x: (b.omegaBody_x || 0) + (n1 * k1[i].dOmegaX + n3 * k3[i].dOmegaX + n4 * k4[i].dOmegaX + n5 * k5[i].dOmegaX + n6 * k6[i].dOmegaX) * dt,
        omegaBody_y: (b.omegaBody_y || 0) + (n1 * k1[i].dOmegaY + n3 * k3[i].dOmegaY + n4 * k4[i].dOmegaY + n5 * k5[i].dOmegaY + n6 * k6[i].dOmegaY) * dt,
        spinRate: (b.spinRate || 0) + (n1 * k1[i].dOmegaZ + n3 * k3[i].dOmegaZ + n4 * k4[i].dOmegaZ + n5 * k5[i].dOmegaZ + n6 * k6[i].dOmegaZ) * dt
      };
    });
  }, [computeForces, softeningConfig, physicsConfig, computeInertiaTensor, spinAxisToQuaternion, quaternionConjugate, rotateVectorByQuaternion, quaternionMultiply, quaternionNormalize, quaternionToSpinAxis]);

  const integrateVerlet = useCallback((bodyStates, dt, scale = null, currentTime = 0) => {
    const forceOptions = {
      softeningConfig,
      includeGR: physicsConfig.includeGR,
      grMode: physicsConfig.grMode,
      includeJ2: physicsConfig.includeJ2,
      j2BackReaction: physicsConfig.j2BackReaction,
      scale: scale,
      currentTime: currentTime
    };
    const { accelerations: a1 } = computeForces(bodyStates, forceOptions);
    const nextPosStates = bodyStates.map((body, i) => ({
      ...body,
      x: body.x + body.vx * dt + 0.5 * a1[i].x * dt * dt,
      y: body.y + body.vy * dt + 0.5 * a1[i].y * dt * dt,
      z: body.z + body.vz * dt + 0.5 * a1[i].z * dt * dt
    }));
    const { accelerations: a2 } = computeForces(nextPosStates, { ...forceOptions, currentTime: currentTime + dt });
    return nextPosStates.map((body, i) => ({
      ...body,
      vx: body.vx + 0.5 * (a1[i].x + a2[i].x) * dt,
      vy: body.vy + 0.5 * (a1[i].y + a2[i].y) * dt,
      vz: body.vz + 0.5 * (a1[i].z + a2[i].z) * dt
    }));
  }, [computeForces, softeningConfig, physicsConfig]);

  const integrateRK4 = useCallback((bodyStates, dt, scale = null, currentTime = 0) => {
    const forceOptions = {
      softeningConfig,
      includeGR: physicsConfig.includeGR,
      grMode: physicsConfig.grMode,
      includeJ2: physicsConfig.includeJ2,
      j2BackReaction: physicsConfig.j2BackReaction,
      scale: scale
    };
    const getDerivatives = (states, t) => {
      const { accelerations } = computeForces(states, { ...forceOptions, currentTime: t });
      return states.map((s, i) => ({
        dx: s.vx, dy: s.vy, dz: s.vz,
        dvx: accelerations[i].x, dvy: accelerations[i].y, dvz: accelerations[i].z
      }));
    };
    const k1 = getDerivatives(bodyStates, currentTime);
    const s2 = bodyStates.map((b, i) => ({
      ...b,
      x: b.x + k1[i].dx * dt * 0.5,
      y: b.y + k1[i].dy * dt * 0.5,
      z: b.z + k1[i].dz * dt * 0.5,
      vx: b.vx + k1[i].dvx * dt * 0.5,
      vy: b.vy + k1[i].dvy * dt * 0.5,
      vz: b.vz + k1[i].dvz * dt * 0.5
    }));
    const k2 = getDerivatives(s2, currentTime + dt * 0.5);
    const s3 = bodyStates.map((b, i) => ({
      ...b,
      x: b.x + k2[i].dx * dt * 0.5,
      y: b.y + k2[i].dy * dt * 0.5,
      z: b.z + k2[i].dz * dt * 0.5,
      vx: b.vx + k2[i].dvx * dt * 0.5,
      vy: b.vy + k2[i].dvy * dt * 0.5,
      vz: b.vz + k2[i].dvz * dt * 0.5
    }));
    const k3 = getDerivatives(s3, currentTime + dt * 0.5);
    const s4 = bodyStates.map((b, i) => ({
      ...b,
      x: b.x + k3[i].dx * dt,
      y: b.y + k3[i].dy * dt,
      z: b.z + k3[i].dz * dt,
      vx: b.vx + k3[i].dvx * dt,
      vy: b.vy + k3[i].dvy * dt,
      vz: b.vz + k3[i].dvz * dt
    }));
    const k4 = getDerivatives(s4, currentTime + dt);
    return bodyStates.map((b, i) => ({
      ...b,
      x: b.x + (k1[i].dx + 2 * k2[i].dx + 2 * k3[i].dx + k4[i].dx) * dt / 6,
      y: b.y + (k1[i].dy + 2 * k2[i].dy + 2 * k3[i].dy + k4[i].dy) * dt / 6,
      z: b.z + (k1[i].dz + 2 * k2[i].dz + 2 * k3[i].dz + k4[i].dz) * dt / 6,
      vx: b.vx + (k1[i].dvx + 2 * k2[i].dvx + 2 * k3[i].dvx + k4[i].dvx) * dt / 6,
      vy: b.vy + (k1[i].dvy + 2 * k2[i].dvy + 2 * k3[i].dvy + k4[i].dvy) * dt / 6,
      vz: b.vz + (k1[i].dvz + 2 * k2[i].dvz + 2 * k3[i].dvz + k4[i].dvz) * dt / 6
    }));
  }, [computeForces, softeningConfig, physicsConfig]);

  const integrateYoshida4 = useCallback((bodyStates, dt, scale = null, currentTime = 0) => {
    const forceOptions = {
      softeningConfig,
      includeGR: physicsConfig.includeGR,
      grMode: physicsConfig.grMode,
      includeJ2: physicsConfig.includeJ2,
      j2BackReaction: physicsConfig.j2BackReaction,
      scale: scale
    };

    const cbrt2 = 1.2599210498948732;
    const w1 = 1.0 / (2.0 - cbrt2);
    const w0 = -cbrt2 * w1;
    const c1 = w1 / 2.0;
    const c2 = (w0 + w1) / 2.0;
    const c3 = c2;
    const c4 = c1;
    const d1 = w1;
    const d2 = w0;
    const d3 = w1;

    const drift = (states, c) => states.map(b => {
      const dx = b.vx * c * dt;
      const dy = b.vy * c * dt;
      const dz = b.vz * c * dt;

      const rx = kahanSum(b.x, dx, b.errX || 0);
      const ry = kahanSum(b.y, dy, b.errY || 0);
      const rz = kahanSum(b.z, dz, b.errZ || 0);

      return {
        ...b,
        x: rx.value, y: ry.value, z: rz.value,
        errX: rx.error, errY: ry.error, errZ: rz.error
      };
    });

    const kick = (states, d, t) => {
      const { accelerations } = computeForces(states, { ...forceOptions, currentTime: t });
      return states.map((b, i) => {
        const dvx = accelerations[i].x * d * dt;
        const dvy = accelerations[i].y * d * dt;
        const dvz = accelerations[i].z * d * dt;

        const rvx = kahanSum(b.vx, dvx, b.errVx || 0);
        const rvy = kahanSum(b.vy, dvy, b.errVy || 0);
        const rvz = kahanSum(b.vz, dvz, b.errVz || 0);

        return {
          ...b,
          vx: rvx.value, vy: rvy.value, vz: rvz.value,
          errVx: rvx.error, errVy: rvy.error, errVz: rvz.error
        };
      });
    };

    let t = currentTime;
    let state = drift(bodyStates, c1);
    t += c1 * dt;
    state = kick(state, d1, t);
    state = drift(state, c2);
    t += c2 * dt;
    state = kick(state, d2, t);
    state = drift(state, c3);
    t += c3 * dt;
    state = kick(state, d3, t);
    state = drift(state, c4);

    return state;
  }, [computeForces, softeningConfig, physicsConfig]);

  const integrate = useCallback((bodyStates, dt, scale = null, currentTime = 0) => {
    switch (integrator) {
      case INTEGRATORS.RK5: return integrateRK5(bodyStates, dt, scale, currentTime);
      case INTEGRATORS.RK4: return integrateRK4(bodyStates, dt, scale, currentTime);
      case INTEGRATORS.YOSHIDA4: return integrateYoshida4(bodyStates, dt, scale, currentTime);
      case INTEGRATORS.VELOCITY_VERLET: default: return integrateVerlet(bodyStates, dt, scale, currentTime);
    }
  }, [integrator, integrateRK5, integrateRK4, integrateYoshida4, integrateVerlet]);

  const computeSystemStats = useCallback((bodyStates) => {
    let kineticEnergy = 0;
    let potentialEnergy = 0;
    let relativisticEnergy = 0;
    let totalMomentum = { x: 0, y: 0, z: 0 };
    let centerOfMass = { x: 0, y: 0, z: 0 };
    let totalMass = 0;

    const effectiveC = getEffectiveSpeedOfLight();
    const c2 = effectiveC * effectiveC;

    const activeBodies = bodyStates.filter(b => !b.isDebris);
    const nActive = activeBodies.length;

    const masses = activeBodies.map(b => b.gm / G_CODATA);
    const velocities = activeBodies.map(b => ({
      x: b.vx, y: b.vy, z: b.vz,
      sq: b.vx * b.vx + b.vy * b.vy + b.vz * b.vz
    }));

    activeBodies.forEach((body, i) => {
      const mass = masses[i];
      const vSq = velocities[i].sq;
      kineticEnergy += 0.5 * mass * vSq;
      totalMomentum.x += mass * body.vx;
      totalMomentum.y += mass * body.vy;
      totalMomentum.z += mass * body.vz;
      centerOfMass.x += mass * body.x;
      centerOfMass.y += mass * body.y;
      centerOfMass.z += mass * body.z;
      totalMass += mass;

      if (physicsConfig.includeGR) {
        const v4Term = (3.0 / 8.0) * mass * vSq * vSq / c2;
        relativisticEnergy += v4Term;
      }
    });

    if (totalMass > 0) {
      centerOfMass.x /= totalMass;
      centerOfMass.y /= totalMass;
      centerOfMass.z /= totalMass;
    }

    const softenings = softeningConfig.enabled
      ? calculateSoftening(activeBodies, softeningConfig)
      : new Array(nActive).fill(0);

    const rMags = [];
    const rVecs = [];
    for (let i = 0; i < nActive; i++) {
      rMags[i] = [];
      rVecs[i] = [];
      for (let j = 0; j < nActive; j++) {
        if (i === j) {
          rMags[i][j] = 0;
          rVecs[i][j] = { x: 0, y: 0, z: 0 };
        } else {
          const dx = activeBodies[j].x - activeBodies[i].x;
          const dy = activeBodies[j].y - activeBodies[i].y;
          const dz = activeBodies[j].z - activeBodies[i].z;
          rMags[i][j] = Math.sqrt(dx * dx + dy * dy + dz * dz);
          rVecs[i][j] = { x: dx, y: dy, z: dz };
        }
      }
    }

    let grPotentials = null;
    if (physicsConfig.includeGR) {
      grPotentials = new Array(nActive).fill(0);
      for (let i = 0; i < nActive; i++) {
        for (let k = 0; k < nActive; k++) {
          if (k !== i && rMags[i][k] > 0) {
            grPotentials[i] += G_CODATA * masses[k] / rMags[i][k];
          }
        }
      }
    }

    for (let i = 0; i < nActive; i++) {
      for (let j = i + 1; j < nActive; j++) {
        const r = rMags[i][j];
        const mi = masses[i];
        const mj = masses[j];

        let potentialFactor;
        if (softeningConfig.enabled && r > 0) {
          const eps = symmetricSoftening(softenings[i], softenings[j]);
          if (softeningConfig.mode === 'plummer') {
            potentialFactor = softeningKernels.plummer.potentialFactor(r, eps);
          } else if (softeningConfig.mode === 'spline') {
            potentialFactor = softeningKernels.spline.potentialFactor(r, eps);
          } else if (softeningConfig.mode === 'wendlandC2') {
            potentialFactor = softeningKernels.wendlandC2.potentialFactor(r, eps);
          } else {
            potentialFactor = 1.0 / r;
          }
        } else if (r > 0) {
          potentialFactor = 1.0 / r;
        } else {
          potentialFactor = 0;
        }

        potentialEnergy -= G_CODATA * mi * mj * potentialFactor;

        if (physicsConfig.includeGR && r > 0) {
          const dx = rVecs[i][j].x;
          const dy = rVecs[i][j].y;
          const dz = rVecs[i][j].z;
          const vi = velocities[i];
          const vj = velocities[j];
          const vi2 = vi.sq;
          const vj2 = vj.sq;
          const vidotvj = vi.x * vj.x + vi.y * vj.y + vi.z * vj.z;
          const nVec = { x: dx / r, y: dy / r, z: dz / r };
          const ndotvi = nVec.x * vi.x + nVec.y * vi.y + nVec.z * vi.z;
          const ndotvj = nVec.x * vj.x + nVec.y * vj.y + nVec.z * vj.z;

          const Uij = G_CODATA * mi * mj / r;

          const velDepTerm = (Uij / (2.0 * c2)) * (
            3.0 * (vi2 + vj2) - 7.0 * vidotvj - ndotvi * ndotvj
          );

          const potSqTerm = -0.5 * Uij * Uij / (c2 * mi * mj) * (mi + mj);

          const phi_i = grPotentials[i];
          const phi_j = grPotentials[j];
          const crossPotentialTerm = -(Uij / c2) * (phi_i / mi + phi_j / mj) * 0.5 * (mi + mj);

          const pairMomentumTerm = (Uij / c2) * (
            (mi * vi2 + mj * vj2) / (2.0 * (mi + mj)) -
            (mi * mj * vidotvj) / ((mi + mj) * (mi + mj))
          );

          relativisticEnergy += velDepTerm + potSqTerm + crossPotentialTerm + pairMomentumTerm;
        }
      }
    }

    const rocheResult = checkRocheLimitViolations(activeBodies, physicsConfig);

    const totalEnergy = kineticEnergy + potentialEnergy + relativisticEnergy;
    let energyDrift = 0;
    if (initialEnergyRef.current !== null && Math.abs(initialEnergyRef.current) > 1e-10) {
      energyDrift = Math.abs((totalEnergy - initialEnergyRef.current) / initialEnergyRef.current) * 100;
    }

    const debrisCount = bodyStates.filter(b => b.isDebris).length;

    return {
      totalEnergy,
      kineticEnergy,
      potentialEnergy,
      relativisticEnergy,
      totalMomentum,
      centerOfMass,
      bodyCount: nActive,
      debrisCount: debrisCount,
      initialEnergy: initialEnergyRef.current,
      energyDrift,
      rocheViolations: rocheResult.violations
    };
  }, [softeningConfig, softeningKernels, calculateSoftening, symmetricSoftening, G_CODATA, physicsConfig, getEffectiveSpeedOfLight, checkRocheLimitViolations]);

  const computeOrbitalElements = useCallback((body, centralBody) => {
    if (!centralBody) return null;
    const r_vec = { x: body.x - centralBody.x, y: body.y - centralBody.y, z: body.z - centralBody.z };
    const v_vec = { x: body.vx - centralBody.vx, y: body.vy - centralBody.vy, z: body.vz - centralBody.vz };
    const r = Math.sqrt(r_vec.x ** 2 + r_vec.y ** 2 + r_vec.z ** 2);
    const v = Math.sqrt(v_vec.x ** 2 + v_vec.y ** 2 + v_vec.z ** 2);
    const mu = centralBody.gm + body.gm;
    const h_vec = {
      x: r_vec.y * v_vec.z - r_vec.z * v_vec.y,
      y: r_vec.z * v_vec.x - r_vec.x * v_vec.z,
      z: r_vec.x * v_vec.y - r_vec.y * v_vec.x
    };
    const h = Math.sqrt(h_vec.x ** 2 + h_vec.y ** 2 + h_vec.z ** 2);
    const n_vec = { x: -h_vec.y, y: h_vec.x, z: 0 };
    const n = Math.sqrt(n_vec.x ** 2 + n_vec.y ** 2);
    const rdotv = r_vec.x * v_vec.x + r_vec.y * v_vec.y + r_vec.z * v_vec.z;
    const e_vec = {
      x: (v_vec.y * h_vec.z - v_vec.z * h_vec.y) / mu - r_vec.x / r,
      y: (v_vec.z * h_vec.x - v_vec.x * h_vec.z) / mu - r_vec.y / r,
      z: (v_vec.x * h_vec.y - v_vec.y * h_vec.x) / mu - r_vec.z / r
    };
    const e = Math.sqrt(e_vec.x ** 2 + e_vec.y ** 2 + e_vec.z ** 2);
    const energy = v * v / 2 - mu / r;
    const a = -mu / (2 * energy);
    const inc = h > 1e-10 ? Math.acos(Math.max(-1, Math.min(1, h_vec.z / h))) : 0;

    let Omega = 0;
    if (n > 1e-10) {
      Omega = Math.atan2(n_vec.y, n_vec.x);
      if (Omega < 0) Omega += 2 * Math.PI;
    }

    let omega = 0;
    if (n > 1e-10 && e > 1e-10) {
      const ndote = n_vec.x * e_vec.x + n_vec.y * e_vec.y + n_vec.z * e_vec.z;
      omega = Math.acos(Math.max(-1, Math.min(1, ndote / (n * e))));
      if (e_vec.z < 0) omega = 2 * Math.PI - omega;
    } else if (e > 1e-10) {
      omega = Math.atan2(e_vec.y, e_vec.x);
    }

    let nu = 0;
    if (e > 1e-10) {
      const edotr = e_vec.x * r_vec.x + e_vec.y * r_vec.y + e_vec.z * r_vec.z;
      nu = Math.acos(Math.max(-1, Math.min(1, edotr / (e * r))));
      if (rdotv < 0) nu = 2 * Math.PI - nu;
    } else {
      const cp = { x: n_vec.y * r_vec.z - n_vec.z * r_vec.y, y: n_vec.z * r_vec.x - n_vec.x * r_vec.z, z: n_vec.x * r_vec.y - n_vec.y * r_vec.x };
      if (n > 1e-10) {
        nu = Math.acos(Math.max(-1, Math.min(1, (n_vec.x * r_vec.x + n_vec.y * r_vec.y + n_vec.z * r_vec.z) / (n * r))));
        if (rdotv < 0) nu = 2 * Math.PI - nu;
      }
    }

    const period = e < 1 ? 2 * Math.PI * Math.sqrt(Math.abs(a * a * a) / mu) : Infinity;
    const periapsis = a * (1 - e);
    const apoapsis = e < 1 ? a * (1 + e) : Infinity;
    let orbitType = 'circular';
    if (e < 1e-4) orbitType = 'circular';
    else if (e < 0.999) orbitType = 'elliptical';
    else if (e < 1.001) orbitType = 'parabolic';
    else orbitType = 'hyperbolic';

    return {
      semiMajorAxis: a,
      eccentricity: e,
      inclination: inc * 180 / Math.PI,
      longitudeOfAscendingNode: Omega * 180 / Math.PI,
      argumentOfPeriapsis: omega * 180 / Math.PI,
      trueAnomaly: nu * 180 / Math.PI,
      period,
      periapsis,
      apoapsis,
      specificEnergy: energy,
      orbitType
    };
  }, []);

  const addBody = useCallback(() => {
    let finalX = parseFloat(newBody.x) || 0;
    let finalY = parseFloat(newBody.y) || 0;
    let finalZ = parseFloat(newBody.z) || 0;
    let finalVx = parseFloat(newBody.vx) || 0;
    let finalVy = parseFloat(newBody.vy) || 0;
    let finalVz = parseFloat(newBody.vz) || 0;

    if (trajectoryMode === "orbit" && orbitConfig.enabled && orbitConfig.centralBodyId) {
      const centralBody = bodies.find(b => b.id === orbitConfig.centralBodyId);
      if (centralBody) {
        const orbitalState = calculateOrbitalState(centralBody, orbitConfig);
        if (orbitalState) {
          finalX = orbitalState.x;
          finalY = orbitalState.y;
          finalZ = orbitalState.z;
          finalVx = orbitalState.vx;
          finalVy = orbitalState.vy;
          finalVz = orbitalState.vz;
        }
      }
    } else if (trajectoryMode === "flyby" && flybyConfig.targetBodyId) {
      const targetBody = bodies.find(b => b.id === flybyConfig.targetBodyId);
      if (targetBody) {
        const flybyState = calculateFlybyState(targetBody, flybyConfig);
        if (flybyState) {
          finalX = flybyState.x;
          finalY = flybyState.y;
          finalZ = flybyState.z;
          finalVx = flybyState.vx;
          finalVy = flybyState.vy;
          finalVz = flybyState.vz;
        }
      }
    } else if (trajectoryMode === "interstellar" && interstellarConfig.referenceBodyId) {
      const referenceBody = bodies.find(b => b.id === interstellarConfig.referenceBodyId);
      if (referenceBody) {
        const interstellarState = calculateInterstellarState(referenceBody, interstellarConfig);
        if (interstellarState) {
          finalX = interstellarState.x;
          finalY = interstellarState.y;
          finalZ = interstellarState.z;
          finalVx = interstellarState.vx;
          finalVy = interstellarState.vy;
          finalVz = interstellarState.vz;
        }
      }
    }

    const spinMag = Math.sqrt(
      (parseFloat(newBody.spinAxisX) || 0) ** 2 +
      (parseFloat(newBody.spinAxisY) || 0) ** 2 +
      (parseFloat(newBody.spinAxisZ) || 1) ** 2
    );

    const body = {
      id: generateId(),
      name: newBody.name || `Body ${bodies.length + 1}`,
      gm: (parseFloat(newBody.mass) || 1) * G_CODATA,
      radius: parseFloat(newBody.radius) || EARTH_RADIUS_MEAN,
      x: finalX,
      y: finalY,
      z: finalZ,
      vx: finalVx,
      vy: finalVy,
      vz: finalVz,
      color: newBody.color || "#4ECDC4",
      trail: [],
      visible: true,
      j2: newBody.j2,
      j2Radius: newBody.j2Radius || null,
      spinAxisX: (parseFloat(newBody.spinAxisX) || 0) / (spinMag || 1),
      spinAxisY: (parseFloat(newBody.spinAxisY) || 0) / (spinMag || 1),
      spinAxisZ: (parseFloat(newBody.spinAxisZ) || 1) / (spinMag || 1),
      spinRate: parseFloat(newBody.spinRate) || 0,
      momentOfInertiaFactor: parseFloat(newBody.momentOfInertiaFactor) || 0.4,
      errX: 0, errY: 0, errZ: 0,
      errVx: 0, errVy: 0, errVz: 0,
      positionHistory: null,
      isDebris: false,
      orientation: null,
      omegaBody_x: 0,
      omegaBody_y: 0
    };

    setBodies(prev => {
      const newBodies = [...prev, body];
      initialEnergyRef.current = null;
      initialBodiesRef.current = newBodies.map(b => ({
        id: b.id,
        name: b.name,
        gm: b.gm,
        radius: b.radius,
        x: b.x,
        y: b.y,
        z: b.z,
        vx: b.vx,
        vy: b.vy,
        vz: b.vz,
        color: b.color,
        j2: b.j2,
        j2Radius: b.j2Radius,
        spinAxisX: b.spinAxisX,
        spinAxisY: b.spinAxisY,
        spinAxisZ: b.spinAxisZ,
        spinRate: b.spinRate,
        momentOfInertiaFactor: b.momentOfInertiaFactor
      }));
      return newBodies;
    });
    setAddBodyModal(false);
    setAddBodyColorPickerOpen(false);
  }, [newBody, bodies, trajectoryMode, orbitConfig, flybyConfig, interstellarConfig,
    calculateOrbitalState, calculateFlybyState, calculateInterstellarState, EARTH_RADIUS_MEAN, G_CODATA]);

  const updateBody = useCallback((id, updates) => {
    setBodies(prev => {
      const newBodies = prev.map(b => {
        if (b.id === id) {
          return { ...b, ...updates };
        }
        return b;
      });
      initialBodiesRef.current = newBodies.map(b => ({
        id: b.id,
        name: b.name,
        gm: b.gm,
        radius: b.radius,
        x: b.x,
        y: b.y,
        z: b.z,
        vx: b.vx,
        vy: b.vy,
        vz: b.vz,
        color: b.color,
        j2: b.j2,
        j2Radius: b.j2Radius,
        spinAxisX: b.spinAxisX,
        spinAxisY: b.spinAxisY,
        spinAxisZ: b.spinAxisZ,
        spinRate: b.spinRate,
        momentOfInertiaFactor: b.momentOfInertiaFactor
      }));
      return newBodies;
    });
    initialEnergyRef.current = null;
  }, []);

  const removeBody = useCallback((id) => {
    setBodies(prev => {
      const newBodies = prev.filter(b => b.id !== id);
      initialEnergyRef.current = null;
      initialBodiesRef.current = newBodies.map(b => ({
        id: b.id,
        name: b.name,
        gm: b.gm,
        radius: b.radius,
        x: b.x,
        y: b.y,
        z: b.z,
        vx: b.vx,
        vy: b.vy,
        vz: b.vz,
        color: b.color,
        j2: b.j2,
        j2Radius: b.j2Radius,
        spinAxisX: b.spinAxisX,
        spinAxisY: b.spinAxisY,
        spinAxisZ: b.spinAxisZ,
        spinRate: b.spinRate,
        momentOfInertiaFactor: b.momentOfInertiaFactor
      }));
      return newBodies;
    });
    if (selectedBody === id) setSelectedBody(null);
    if (focusedBody === id) setFocusedBody(null);
  }, [selectedBody, focusedBody]);

  const clearAllBodies = () => {
    setBodies([]);
    setSelectedBody(null);
    setFocusedBody(null);
    setSimulationTime(0);
    setIsRunning(false);
    initialEnergyRef.current = null;
    initialBodiesRef.current = [];
    mergedBodyIdsRef.current.clear();
    setPnWarnings([]);
  };

  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setSimulationTime(0);
    initialEnergyRef.current = null;
    setPnWarnings([]);
    mergedBodyIdsRef.current.clear();
    
    if (initialBodiesRef.current.length > 0) {
      setBodies(initialBodiesRef.current.map(ib => ({
        ...ib,
        trail: [],
        visible: true,
        positionHistory: null,
        isDebris: false,
        orientation: null,
        omegaBody_x: 0,
        omegaBody_y: 0,
        errX: 0,
        errY: 0,
        errZ: 0,
        errVx: 0,
        errVy: 0,
        errVz: 0
      })));
    } else {
      setBodies(prev => prev.map(b => ({
        ...b,
        trail: [],
        positionHistory: null,
        isDebris: false,
        orientation: null,
        omegaBody_x: 0,
        omegaBody_y: 0
      })));
    }
  }, []);

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return "N/A";
    if (!isFinite(num)) return num > 0 ? "∞" : "-∞";
    if (Math.abs(num) < 1e-10) return "0";
    if (Math.abs(num) >= 1e9 || Math.abs(num) < 1e-3) {
      return num.toExponential(decimals);
    }
    return num.toFixed(decimals);
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return "∞";
    const days = Math.floor(seconds / DAY_SECONDS);
    const years = Math.floor(days / 365.25);
    const remainingDays = Math.floor(days % 365.25);
    if (years > 0) return `${years}y ${remainingDays}d`;
    if (days > 0) return `${days}d ${Math.floor((seconds % DAY_SECONDS) / 3600)}h`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const handleHudMouseDown = useCallback((e) => {
    if (e.target.closest(".nbody-close-btn")) return;
    e.preventDefault();
    setIsDraggingHud(true);
    setDragStart({ x: e.clientX - hudPosition.x, y: e.clientY - hudPosition.y });
  }, [hudPosition]);

  const handleHudMouseMove = useCallback((e) => {
    if (!isDraggingHud || !hudPanelRef.current) return;
    e.preventDefault();
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;
    const winW = window.innerWidth, winH = window.innerHeight;
    const rect = hudPanelRef.current.getBoundingClientRect();
    const minX = (rect.width / 2) - (winW / 2) + 10;
    const maxX = (rect.width / 2) - (winW / 2) + winW - 10;
    const minY = (rect.height / 2) - (winH / 2) + 10;
    const maxY = (rect.height / 2) - (winH / 2) + winH - 10;
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));
    setHudPosition({ x: newX, y: newY });
  }, [isDraggingHud, dragStart]);

  const handleHudMouseUp = useCallback(() => setIsDraggingHud(false), []);

  useEffect(() => {
    if (isDraggingHud) {
      document.addEventListener("mousemove", handleHudMouseMove);
      document.addEventListener("mouseup", handleHudMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleHudMouseMove);
        document.removeEventListener("mouseup", handleHudMouseUp);
      };
    }
  }, [isDraggingHud, handleHudMouseMove, handleHudMouseUp]);

  useEffect(() => {
    document.body.className = `nbody-theme-${theme}`;
    return () => { document.body.className = ""; };
  }, [theme]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100000);
    camera.position.set(100, 60, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const labelContainer = document.createElement("div");
    labelContainer.className = "nbody-label-container";
    mountRef.current.appendChild(labelContainer);
    labelContainerRef.current = labelContainer;

    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambient);
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 0, 0.5);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const gridSize = 4000;
    const gridSegments = 400;
    const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize, gridSegments, gridSegments);
    gridGeometry.rotateX(-Math.PI / 2);

    const gridPositions = gridGeometry.attributes.position.array.slice();
    gridGeometry.userData.originalPositions = gridPositions;

    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uGridColor: { value: new THREE.Color(0xc1c1c1) },
        uTime: { value: 0.0 },
        uScale: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying float vDepth;
        varying vec3 vWorldPos;
        uniform float uScale;
        void main() {
          vPosition = position * uScale;
          vDepth = -position.y * uScale;
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGridColor;
        uniform float uTime;
        uniform float uScale;
        varying vec3 vPosition;
        varying float vDepth;
        varying vec3 vWorldPos;
        float getGrid(vec2 pos, float scale) {
          vec2 grid = abs(fract(pos / scale - 0.5) - 0.5) / fwidth(pos / scale);
          return 1.0 - min(min(grid.x, grid.y), 1.0);
        }
        void main() {
          float baseUnit = 2.5 * uScale;
          float microGrid = getGrid(vPosition.xz, baseUnit);
          float minorGrid = getGrid(vPosition.xz, baseUnit * 4.0);
          float majorGrid = getGrid(vPosition.xz, baseUnit * 20.0);
          float superGrid = getGrid(vPosition.xz, baseUnit * 100.0);
          float depthNorm = clamp(vDepth / (200.0 * uScale), 0.0, 1.0);
          float depthSq = depthNorm * depthNorm;
          vec3 shallowColor = uGridColor * 0.9;
          vec3 midColor = vec3(0.6, 0.5, 0.7);
          vec3 deepColor = vec3(0.9, 0.4, 0.3);
          vec3 coreColor = vec3(1.0, 0.7, 0.2);
          vec3 wellColor;
          if (depthNorm < 0.25) {
            wellColor = mix(shallowColor, midColor, depthNorm * 4.0);
          } else if (depthNorm < 0.5) {
            wellColor = mix(midColor, deepColor, (depthNorm - 0.25) * 4.0);
          } else {
            wellColor = mix(deepColor, coreColor, (depthNorm - 0.5) * 2.0);
          }
          vec3 baseColor = uGridColor * 0.12;
          vec3 gridColor = baseColor;
          gridColor = mix(gridColor, uGridColor * 0.35, microGrid * 0.5);
          gridColor = mix(gridColor, uGridColor * 0.55, minorGrid * 0.7);
          gridColor = mix(gridColor, uGridColor * 0.8, majorGrid * 0.9);
          gridColor = mix(gridColor, uGridColor, superGrid);
          gridColor = mix(gridColor, wellColor, depthSq * 0.85);
          gridColor = mix(gridColor, wellColor, majorGrid * depthNorm * 0.6);
          float glow = depthSq * 0.5;
          gridColor += coreColor * glow * majorGrid;
          float combinedGrid = max(max(microGrid * 0.3, minorGrid * 0.5), max(majorGrid * 0.8, superGrid));
          float alpha = combinedGrid * 0.75 + 0.1;
          alpha = max(alpha, depthNorm * 0.6);
          alpha = clamp(alpha, 0.08, 0.95);
          gl_FragColor = vec4(gridColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: false,
      depthWrite: false
    });

    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.visible = showGrid;
    scene.add(gridMesh);
    gridRef.current = gridMesh;

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 8000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 5000 + Math.random() * 40000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.8, sizeAttenuation: true });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50000;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    renderer.render(scene, camera);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mountRef.current) {
        if (renderer.domElement && mountRef.current.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement);
        }
        if (labelContainer && mountRef.current.contains(labelContainer)) {
          mountRef.current.removeChild(labelContainer);
        }
      }
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    Object.keys(meshesRef.current).forEach(id => {
      if (!bodies.find(b => b.id === id)) {
        scene.remove(meshesRef.current[id]);
        if (meshesRef.current[id].geometry) meshesRef.current[id].geometry.dispose();
        if (meshesRef.current[id].material) meshesRef.current[id].material.dispose();
        delete meshesRef.current[id];
      }
    });

    Object.keys(trailsRef.current).forEach(id => {
      if (!bodies.find(b => b.id === id)) {
        scene.remove(trailsRef.current[id]);
        if (trailsRef.current[id].geometry) trailsRef.current[id].geometry.dispose();
        if (trailsRef.current[id].material) trailsRef.current[id].material.dispose();
        delete trailsRef.current[id];
      }
    });

    Object.keys(labelsRef.current).forEach(id => {
      if (!bodies.find(b => b.id === id)) {
        if (labelsRef.current[id] && labelsRef.current[id].parentNode) {
          labelsRef.current[id].parentNode.removeChild(labelsRef.current[id]);
        }
        delete labelsRef.current[id];
      }
    });

    Object.keys(vectorsRef.current).forEach(id => {
      if (!bodies.find(b => b.id === id)) {
        scene.remove(vectorsRef.current[id]);
        delete vectorsRef.current[id];
      }
    });

    bodies.forEach(body => {
      if (!meshesRef.current[body.id]) {
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
          color: body.color,
          emissive: body.color,
          emissiveIntensity: 0.3,
          shininess: 30
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        meshesRef.current[body.id] = mesh;

        const glowGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: body.color,
          transparent: true,
          opacity: 0.15,
          side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        mesh.add(glow);
      } else {
        meshesRef.current[body.id].material.color.set(body.color);
        meshesRef.current[body.id].material.emissive.set(body.color);
      }

      const mesh = meshesRef.current[body.id];
      if (mesh) {
        const visualRadius = scaleRadius(body.radius, body.gm);
        mesh.scale.setScalar(visualRadius);
      }

      if (!trailsRef.current[body.id]) {
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(trailLength * 3);
        trailGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        trailGeometry.setDrawRange(0, 0);
        const trailMaterial = new THREE.LineBasicMaterial({
          color: body.color,
          transparent: true,
          opacity: 0.6
        });
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        scene.add(trail);
        trailsRef.current[body.id] = trail;
      } else {
        trailsRef.current[body.id].material.color.set(body.color);
      }

      if (!labelsRef.current[body.id] && labelContainerRef.current) {
        const label = document.createElement("div");
        label.className = "nbody-label";
        label.textContent = body.name;
        label.style.color = body.color;
        label.style.borderColor = body.color;
        labelContainerRef.current.appendChild(label);
        labelsRef.current[body.id] = label;
      } else if (labelsRef.current[body.id]) {
        labelsRef.current[body.id].textContent = body.name;
        labelsRef.current[body.id].style.color = body.color;
        labelsRef.current[body.id].style.borderColor = body.color;
      }

      if (!vectorsRef.current[body.id]) {
        const arrowGroup = new THREE.Group();
        const arrowMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const arrowGeometry = new THREE.BufferGeometry();
        arrowGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
        const arrow = new THREE.Line(arrowGeometry, arrowMaterial);
        arrowGroup.add(arrow);
        arrowGroup.visible = showVectors;
        scene.add(arrowGroup);
        vectorsRef.current[body.id] = arrowGroup;
      }
    });
  }, [bodies, trailLength, showVectors, scaleRadius]);

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const animate = (currentTime) => {
      animationRef.current = requestAnimationFrame(animate);

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      fpsCounterRef.current++;
      if (currentTime - lastFpsTimeRef.current >= 1000) {
        setActualFps(fpsCounterRef.current);
        fpsCounterRef.current = 0;
        lastFpsTimeRef.current = currentTime;
      }

      const currentBodies = bodiesRef.current;
      const currentSimTime = simulationTimeRef.current;

      if (isRunning && currentBodies.length > 0) {
        let physicsState = currentBodies.map(b => ({
          ...b,
          positionHistory: b.positionHistory || null
        }));

        if (initialEnergyRef.current === null && physicsState.length >= 2) {
          const stats = computeSystemStats(physicsState);
          initialEnergyRef.current = stats.totalEnergy;
        }

        if (physicsConfig.barycentricCorrection && physicsState.length >= 2) {
          physicsState = applyBarycentricCorrection(physicsState);
        }

        let scale = null;
        let normalizedState = physicsState;

        if (physicsConfig.useNormalizedUnits && physicsState.length >= 2) {
          const normalized = toNormalizedUnits(physicsState);
          normalizedState = normalized.bodies;
          scale = normalized.scale;
        }

        let effectiveDt = timeStep;
        let subSteps = Math.ceil(speedMultiplier);

        const isSymplectic = integrator === INTEGRATORS.YOSHIDA4 || integrator === INTEGRATORS.VELOCITY_VERLET;

        if (scale) {
          effectiveDt = timeStep / scale.time;
        }

        if (!isSymplectic && physicsConfig.timestepMethod !== 'fixed' && normalizedState.length >= 2) {
          const adaptiveDt = computeAdaptiveTimestep(normalizedState, effectiveDt, {
            method: physicsConfig.timestepMethod,
            eta: physicsConfig.timestepEta,
            scale: scale
          });
          const totalSimTime = scale ? (timeStep * speedMultiplier) / scale.time : (timeStep * speedMultiplier);
          subSteps = Math.ceil(totalSimTime / adaptiveDt);
          subSteps = Math.max(1, Math.min(subSteps, 10000));
          effectiveDt = totalSimTime / subSteps;
        } else {
          const totalSimTime = scale ? (timeStep * speedMultiplier) / scale.time : (timeStep * speedMultiplier);
          effectiveDt = totalSimTime / subSteps;
        }

        let normalizedTime = scale ? currentSimTime / scale.time : currentSimTime;

        for (let i = 0; i < subSteps; i++) {
          if (physicsConfig.relativisticMode && physicsConfig.retardedGravity) {
            for (let j = 0; j < normalizedState.length; j++) {
              const b = normalizedState[j];
              if (!b.positionHistory) {
                b.positionHistory = initializeHistoryBuffer(b, normalizedState, normalizedTime, physicsConfig.historyBufferSize, scale ? scale.c : getEffectiveSpeedOfLight());
              }
              ringBufferPush(b.positionHistory, b.x, b.y, b.z, b.vx, b.vy, b.vz, normalizedTime);
            }
          }

          normalizedState = integrate(normalizedState, effectiveDt, scale, normalizedTime);
          normalizedTime += effectiveDt;

          if (physicsConfig.collisionMode !== 'none') {
            const collisionResult = detectAndHandleCollisions(normalizedState, physicsConfig, scale);
            normalizedState = collisionResult.states;
            if (collisionResult.collisions.length > 0) {
              collisionResult.collisions.forEach(c => {
                c.bodies.forEach(bid => mergedBodyIdsRef.current.add(bid));
              });
            }
          }

          if (physicsConfig.enableRocheLimit && physicsConfig.rocheDisruptionMode === 'disrupt') {
            const rocheResult = checkRocheLimitViolations(normalizedState, physicsConfig);
            if (rocheResult.debrisConversions.length > 0) {
              normalizedState = convertToDebris(normalizedState, rocheResult.debrisConversions);
            }
          }
        }

        if (physicsConfig.includeGR) {
          const warnings = checkPNValidity(normalizedState, scale);
          if (warnings.length > 0) {
            setPnWarnings(warnings.slice(0, 3));
          } else {
            setPnWarnings([]);
          }
        }

        let finalState;
        if (scale) {
          finalState = fromNormalizedUnits(normalizedState, scale, currentBodies);
        } else {
          finalState = normalizedState.map(ns => {
            const orig = currentBodies.find(b => b.id === ns.id);
            return { ...(orig || {}), ...ns };
          });
        }

        const updatedBodies = [];
        for (let i = 0; i < finalState.length; i++) {
          const ps = finalState[i];
          const origBody = currentBodies.find(b => b.id === ps.id);
          
          if (!origBody) continue;

          const scaledPos = scaleVector(ps.x, ps.y, ps.z);
          const newTrail = [...(origBody.trail || [])];
          if (newTrail.length >= trailLength) {
            newTrail.shift();
          }
          newTrail.push({ ...scaledPos });

          updatedBodies.push({
            ...origBody,
            ...ps,
            trail: newTrail
          });
        }

        setBodies(updatedBodies);
        setSimulationTime(prev => prev + (timeStep * speedMultiplier));

        const statsState = updatedBodies.map(b => ({
          ...b,
          gm: b.gm, x: b.x, y: b.y, z: b.z,
          vx: b.vx, vy: b.vy, vz: b.vz
        }));
        setSystemStats(computeSystemStats(statsState));
      }

      currentBodies.forEach(body => {
        const mesh = meshesRef.current[body.id];
        if (mesh) {
          const scaledPos = scaleVector(body.x, body.y, body.z);
          mesh.position.set(scaledPos.x, scaledPos.y, scaledPos.z);
          const visualRadius = scaleRadius(body.radius, body.gm);
          mesh.scale.setScalar(visualRadius);
          mesh.visible = body.visible;
        }

        const trail = trailsRef.current[body.id];
        if (trail && showTrails && body.trail && body.trail.length > 1) {
          const positions = trail.geometry.attributes.position.array;
          const len = Math.min(body.trail.length, trailLength);
          for (let i = 0; i < len; i++) {
            positions[i * 3] = body.trail[i].x;
            positions[i * 3 + 1] = body.trail[i].y;
            positions[i * 3 + 2] = body.trail[i].z;
          }
          trail.geometry.attributes.position.needsUpdate = true;
          trail.geometry.setDrawRange(0, len);
          trail.visible = body.visible && showTrails;
        } else if (trail) {
          trail.visible = false;
        }

        const label = labelsRef.current[body.id];
        if (label && showLabels && body.visible) {
          const scaledPos = scaleVector(body.x, body.y, body.z);
          const pos = new THREE.Vector3(scaledPos.x, scaledPos.y, scaledPos.z);
          pos.project(camera);

          if (pos.z < 1 && mountRef.current) {
            const x = (pos.x * 0.5 + 0.5) * mountRef.current.clientWidth;
            const y = (pos.y * -0.5 + 0.5) * mountRef.current.clientHeight;
            label.style.left = `${x}px`;
            label.style.top = `${y - 25}px`;
            label.style.display = "block";
          } else {
            label.style.display = "none";
          }
        } else if (label) {
          label.style.display = "none";
        }

        const vectorGroup = vectorsRef.current[body.id];
        if (vectorGroup && showVectors && body.visible) {
          const arrow = vectorGroup.children[0];
          const positions = arrow.geometry.attributes.position.array;
          const scaledPos = scaleVector(body.x, body.y, body.z);
          const vScale = 1e-4;
          positions[0] = scaledPos.x;
          positions[1] = scaledPos.y;
          positions[2] = scaledPos.z;
          positions[3] = scaledPos.x + body.vx * vScale;
          positions[4] = scaledPos.y + body.vy * vScale;
          positions[5] = scaledPos.z + body.vz * vScale;
          arrow.geometry.attributes.position.needsUpdate = true;
          vectorGroup.visible = true;
        } else if (vectorGroup) {
          vectorGroup.visible = false;
        }
      });

      if (focusedBody) {
        const body = currentBodies.find(b => b.id === focusedBody);
        if (body) {
          const scaledPos = scaleVector(body.x, body.y, body.z);
          const targetPos = new THREE.Vector3(scaledPos.x, scaledPos.y, scaledPos.z);
          controls.target.lerp(targetPos, 0.05);
        }
      }

      if (gridRef.current && gridRef.current.geometry && showGrid && currentBodies.length > 0) {
        const geometry = gridRef.current.geometry;
        const positions = geometry.attributes.position.array;
        const originalPositions = geometry.userData.originalPositions;

        if (gridRef.current.material.uniforms) {
          gridRef.current.material.uniforms.uTime.value = currentTime * 0.001;
        }

        if (originalPositions) {
          const warpStrength = gridWarpStrength;
          const maxWarp = 120;
          const falloffPower = 0.8;
          const spreadFactor = (100 - gridWarpSpread) / 400 + 0.02;

          for (let i = 0; i < positions.length; i += 3) {
            const ox = originalPositions[i];
            const oy = originalPositions[i + 1];
            const oz = originalPositions[i + 2];
            let totalWarp = 0;
            currentBodies.forEach(body => {
              if (!body.visible) return;
              const scaledPos = scaleVector(body.x, body.y, body.z);
              const dx = ox - scaledPos.x;
              const dz = oz - scaledPos.z;
              const distSq = dx * dx + dz * dz;
              const massScale = Math.log10((body.gm / G_CODATA) + 1) - 18;
              const influence = Math.max(0, massScale) * warpStrength;
              const scaledDist = Math.sqrt(distSq) * spreadFactor + 1.0;
              const warp = influence / Math.pow(scaledDist, falloffPower);
              const gaussian = Math.exp(-distSq * 0.0003) * influence * 0.5;
              totalWarp += warp + gaussian;
            });
            totalWarp = Math.min(totalWarp, maxWarp);
            positions[i] = ox;
            positions[i + 1] = oy - totalWarp;
            positions[i + 2] = oz;
          }
          geometry.attributes.position.needsUpdate = true;
          geometry.computeVertexNormals();
        }
      } else if (gridRef.current && gridRef.current.geometry && showGrid) {
        const geometry = gridRef.current.geometry;
        const positions = geometry.attributes.position.array;
        const originalPositions = geometry.userData.originalPositions;
        if (originalPositions) {
          for (let i = 0; i < positions.length; i++) {
            positions[i] = originalPositions[i];
          }
          geometry.attributes.position.needsUpdate = true;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate(performance.now());

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, timeStep, speedMultiplier, showTrails, showLabels, showVectors, showGrid,
    gridWarpStrength, gridWarpSpread, integrate, scaleVector, scaleRadius, computeSystemStats,
    focusedBody, trailLength, computeAdaptiveTimestep, physicsConfig, G_CODATA, integrator, INTEGRATORS,
    applyBarycentricCorrection, toNormalizedUnits, fromNormalizedUnits, detectAndHandleCollisions,
    checkRocheLimitViolations, checkPNValidity, initializeHistoryBuffer, ringBufferPush, convertToDebris,
    getEffectiveSpeedOfLight]);

  const selectedBodyData = useMemo(() => {
    if (!selectedBody) return null;
    return bodies.find(b => b.id === selectedBody);
  }, [selectedBody, bodies]);

  const selectedBodyOrbital = useMemo(() => {
    if (!selectedBodyData || bodies.length < 2) return null;
    const massiveBodies = [...bodies].sort((a, b) => b.gm - a.gm);
    const centralBody = massiveBodies.find(b => b.id !== selectedBody);
    if (!centralBody) return null;
    return computeOrbitalElements(selectedBodyData, centralBody);
  }, [selectedBodyData, bodies, selectedBody, computeOrbitalElements]);

  const getOrbitTypeClass = (orbitType) => {
    switch (orbitType) {
      case "hyperbolic": return "nbody-orbit-type-hyperbolic";
      case "parabolic": return "nbody-orbit-type-parabolic";
      default: return "nbody-orbit-type-bound";
    }
  };

  const getEnergyDriftClass = (drift) => {
    if (drift < 1) return "nbody-status-good";
    if (drift < 5) return "nbody-status-warning";
    return "nbody-status-critical";
  };

  const getStatusOnClass = () => "nbody-status-on";
  const getStatusOffClass = () => "nbody-status-off";

  const isSymplecticDisabled = physicsConfig.includeGR || physicsConfig.includeJ2 || (physicsConfig.relativisticMode && physicsConfig.retardedGravity);

  const isRK4DisabledFor25PN = physicsConfig.includeGR && physicsConfig.grMode === '2.5pn';

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"} />

      <div className={`nbody-container nbody-theme-${theme}`}>
        <div className={`nbody-sidebar ${sidebarCollapsed ? "nbody-sidebar-collapsed" : ""}`}>
          {!sidebarCollapsed && (
            <>
              <div className="dinosatNBBodySimControlsPanel">
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="dinosatNBBodySimControlGroup">
                    <label>Time Step (s)</label>
                    <input type="number" value={timeStep} onChange={(e) => setTimeStep(parseFloat(e.target.value) || 1)} className="dinosatNBBodySimInput" />
                  </div>
                  <div className="dinosatNBBodySimControlGroup">
                    <label>Integrator</label>
                    <select value={integrator} onChange={(e) => { const newIntegrator = e.target.value; setIntegrator(newIntegrator); if (newIntegrator === INTEGRATORS.YOSHIDA4 || newIntegrator === INTEGRATORS.VELOCITY_VERLET) { setPhysicsConfig(prev => ({ ...prev, timestepMethod: 'fixed' })); } }} className="dinosatNBBodySimSelect">
                      <option value={INTEGRATORS.RK5}>RK5 Dormand-Prince</option>
                      <option value={INTEGRATORS.RK4} disabled={isRK4DisabledFor25PN}>RK4 (4th Order){isRK4DisabledFor25PN ? ' - N/A for 2.5PN' : ''}</option>
                      <option value={INTEGRATORS.YOSHIDA4} disabled={isSymplecticDisabled}>Yoshida4 (Symplectic){isSymplecticDisabled ? ' - N/A' : ''}</option>
                      <option value={INTEGRATORS.VELOCITY_VERLET} disabled={isSymplecticDisabled}>Verlet (Symplectic){isSymplecticDisabled ? ' - N/A' : ''}</option>
                    </select>
                  </div>
                  <div className="dinosatNBBodySimControlGroup">
                    <label>Timestep Mode</label>
                    <select value={physicsConfig.timestepMethod} onChange={(e) => setPhysicsConfig({ ...physicsConfig, timestepMethod: e.target.value })} className="dinosatNBBodySimSelect" disabled={integrator === INTEGRATORS.YOSHIDA4 || integrator === INTEGRATORS.VELOCITY_VERLET}>
                      <option value="fixed">Fixed Δt</option>
                      <option value="aarseth">Aarseth (a/ȧ)</option>
                      <option value="higherorder">Higher-Order</option>
                    </select>
                  </div>
                </div>
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="dinosatNBBodySimControlGroup">
                    <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={physicsConfig.useNormalizedUnits} onChange={(e) => setPhysicsConfig({ ...physicsConfig, useNormalizedUnits: e.target.checked })} /><span>Normalized Units</span></label>
                  </div>
                  <div className="dinosatNBBodySimControlGroup">
                    <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={physicsConfig.barycentricCorrection} onChange={(e) => setPhysicsConfig({ ...physicsConfig, barycentricCorrection: e.target.checked })} /><span>Barycentric Frame</span></label>
                  </div>
                </div>
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="dinosatNBBodySimControlGroup">
                    <label>Collision Mode</label>
                    <select value={physicsConfig.collisionMode} onChange={(e) => setPhysicsConfig({ ...physicsConfig, collisionMode: e.target.value })} className="dinosatNBBodySimSelect">
                      <option value="none">None</option>
                      <option value="merge">Merge (Inelastic)</option>
                    </select>
                  </div>
                  {physicsConfig.collisionMode === 'merge' && (
                    <div className="dinosatNBBodySimControlGroup">
                      <label>Ejecta Mass Loss (%)</label>
                      <input type="number" value={(physicsConfig.collisionMassLoss || 0) * 100} onChange={(e) => setPhysicsConfig({ ...physicsConfig, collisionMassLoss: Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)) / 100 })} className="dinosatNBBodySimInput" min="0" max="20" step="0.5" />
                    </div>
                  )}
                </div>
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="dinosatNBBodySimControlGroup">
                    <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={physicsConfig.enableRocheLimit} onChange={(e) => setPhysicsConfig({ ...physicsConfig, enableRocheLimit: e.target.checked })} /><span>Roche Limit Detection</span></label>
                  </div>
                </div>
                {physicsConfig.enableRocheLimit && (
                  <div className="dinosatNBBodySimControlGroupStack">
                    <div className="dinosatNBBodySimControlGroup">
                      <label>Roche Mode</label>
                      <select value={physicsConfig.rocheDisruptionMode} onChange={(e) => setPhysicsConfig({ ...physicsConfig, rocheDisruptionMode: e.target.value })} className="dinosatNBBodySimSelect">
                        <option value="warning">Warning Only</option>
                        <option value="disrupt">Convert to Debris</option>
                      </select>
                    </div>
                    {physicsConfig.rocheDisruptionMode === 'disrupt' && (
                      <div className="nbody-physics-info">Debris: passive mass (no gravity on others).</div>
                    )}
                  </div>
                )}
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="dinosatNBBodySimControlGroup">
                    <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={physicsConfig.includeGR} onChange={(e) => { const newGR = e.target.checked; setPhysicsConfig({ ...physicsConfig, includeGR: newGR }); if (newGR && (integrator === INTEGRATORS.YOSHIDA4 || integrator === INTEGRATORS.VELOCITY_VERLET)) { setIntegrator(INTEGRATORS.RK5); } if (newGR && physicsConfig.grMode === '2.5pn' && integrator === INTEGRATORS.RK4) { setIntegrator(INTEGRATORS.RK5); } }} /><span>GR Corrections</span></label>
                  </div>
                  <div className="dinosatNBBodySimControlGroup">
                    <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={physicsConfig.includeJ2} onChange={(e) => { const newJ2 = e.target.checked; setPhysicsConfig({ ...physicsConfig, includeJ2: newJ2 }); if (newJ2 && (integrator === INTEGRATORS.YOSHIDA4 || integrator === INTEGRATORS.VELOCITY_VERLET)) { setIntegrator(INTEGRATORS.RK5); } }} /><span>J2 Oblateness</span></label>
                  </div>
                </div>
                {physicsConfig.includeGR && (
                  <div className="dinosatNBBodySimControlGroupStack">
                    <div className="dinosatNBBodySimControlGroup">
                      <label>GR Order</label>
                      <select value={physicsConfig.grMode} onChange={(e) => { const newMode = e.target.value; setPhysicsConfig({ ...physicsConfig, grMode: newMode }); if (newMode === '2.5pn' && integrator === INTEGRATORS.RK4) { setIntegrator(INTEGRATORS.RK5); } }} className="dinosatNBBodySimSelect">
                        <option value="1pn">1PN (Conservative)</option>
                        <option value="2.5pn">2.5PN (GW Radiation)</option>
                      </select>
                    </div>
                  </div>
                )}
                {physicsConfig.includeGR && physicsConfig.grMode === '2.5pn' && (
                  <div className="dinosatNBBodySimControlGroupStack">
                    <div className="dinosatNBBodySimControlGroup">
                      <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={physicsConfig.relativisticMode} onChange={(e) => setPhysicsConfig({ ...physicsConfig, relativisticMode: e.target.checked })} /><span>Relativistic Mode (Visible GW)</span></label>
                    </div>
                    {physicsConfig.relativisticMode && (
                      <div className="dinosatNBBodySimControlGroup">
                        <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={physicsConfig.retardedGravity} onChange={(e) => { const newRetarded = e.target.checked; setPhysicsConfig({ ...physicsConfig, retardedGravity: newRetarded }); if (newRetarded && (integrator === INTEGRATORS.YOSHIDA4 || integrator === INTEGRATORS.VELOCITY_VERLET)) { setIntegrator(INTEGRATORS.RK5); } }} /><span>Retarded Gravity (Finite c)</span></label>
                      </div>
                    )}
                    {physicsConfig.relativisticMode && physicsConfig.retardedGravity && (
                      <div className="nbody-physics-warning">⚠️ 2.5PN radiation disabled - retardation provides energy drain.</div>
                    )}
                    {physicsConfig.relativisticMode && (
                      <div className="nbody-physics-warning">⚠️ Non-physical c! For visualization only. GW decay now visible.</div>
                    )}
                  </div>
                )}
                {physicsConfig.includeGR && physicsConfig.grMode === '2.5pn' && physicsConfig.relativisticMode && (
                  <div className="dinosatNBBodySimControlGroupStack">
                    <div className="dinosatNBBodySimControlGroup">
                      <label>c Reduction Factor</label>
                      <select value={physicsConfig.cReductionFactor} onChange={(e) => setPhysicsConfig({ ...physicsConfig, cReductionFactor: parseInt(e.target.value) })} className="dinosatNBBodySimSelect">
                        <option value={100}>100× (c ≈ 3×10⁶ m/s)</option>
                        <option value={1000}>1000× (c ≈ 3×10⁵ m/s)</option>
                        <option value={10000}>10000× (c ≈ 3×10⁴ m/s)</option>
                      </select>
                    </div>
                  </div>
                )}
                {physicsConfig.includeJ2 && (
                  <div className="dinosatNBBodySimControlGroupStack">
                    <div className="dinosatNBBodySimControlGroup">
                      <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={physicsConfig.j2BackReaction} onChange={(e) => setPhysicsConfig({ ...physicsConfig, j2BackReaction: e.target.checked })} /><span>Spin Axis Precession</span></label>
                    </div>
                  </div>
                )}
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="dinosatNBBodySimControlGroup">
                    <label className="dinosatNBBodySimCheckboxLabel"><input type="checkbox" checked={softeningConfig.enabled} onChange={(e) => setSofteningConfig({ ...softeningConfig, enabled: e.target.checked })} /><span>Softening (Collisionless)</span></label>
                  </div>
                </div>
                {softeningConfig.enabled && (
                  <div className="dinosatNBBodySimControlGroupStack">
                    <div className="nbody-physics-warning" style={{padding: 0, textAlign: "center"}}>Softening alters 1/r² gravity. Not suitable for planetary dynamics.</div>
                    <div className="dinosatNBBodySimControlGroup">
                      <label>Kernel</label>
                      <select value={softeningConfig.mode} onChange={(e) => setSofteningConfig({ ...softeningConfig, mode: e.target.value })} className="dinosatNBBodySimSelect">
                        <option value="plummer">Plummer</option>
                        <option value="spline">Cubic Spline</option>
                        <option value="wendlandC2">Wendland C2</option>
                      </select>
                    </div>
                    <div className="dinosatNBBodySimControlGroup">
                      <label>ε Length (m)</label>
                      <input type="number" value={softeningConfig.fixedLength} onChange={(e) => setSofteningConfig({ ...softeningConfig, fixedLength: parseFloat(e.target.value) || 1e9 })} className="dinosatNBBodySimInput" />
                    </div>
                  </div>
                )}
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="dinosatNBBodySimControlGroup">
                    <label>Scale Mode</label>
                    <select value={scaleMode} onChange={(e) => setScaleMode(e.target.value)} className="dinosatNBBodySimSelect">
                      <option value="log">Logarithmic</option>
                      <option value="linear">Linear</option>
                    </select>
                  </div>
                  <div className="dinosatNBBodySimControlGroup">
                    <label>Trail Length</label>
                    <input type="number" value={trailLength} onChange={(e) => setTrailLength(parseInt(e.target.value) || 100)} className="dinosatNBBodySimInput" min="10" max="2000" />
                  </div>
                </div>
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="dinosatNBBodySimControlGroupSlider">
                    <label>Grid Warp<span className="dinosatNBBodySimSliderValue">{gridWarpStrength}</span></label>
                    <div className="dinosatNBBodySimSliderGroup"><input type="range" value={gridWarpStrength} onChange={(e) => setGridWarpStrength(parseFloat(e.target.value))} className="dinosatNBBodySimSlider" min="0" max="200" step="1" /></div>
                  </div>
                  <div className="dinosatNBBodySimControlGroupSlider">
                    <label>Warp Spread<span className="dinosatNBBodySimSliderValue">{gridWarpSpread}</span></label>
                    <div className="dinosatNBBodySimSliderGroup"><input type="range" value={gridWarpSpread} onChange={(e) => setGridWarpSpread(parseFloat(e.target.value))} className="dinosatNBBodySimSlider" min="10" max="100" step="5" /></div>
                  </div>
                </div>
                <div className="dinosatNBBodySimControlGroupStack">
                  <div className="nbody-section-header"><FontAwesomeIcon icon={faGlobe} /> Bodies ({bodies.length})</div>
                  <div className="dinosatNBBodySimControlActionsLong">
                    <button className="dinosatNBBodySimBtnLong dinosatNBBodySimBtnPrimary" onClick={openAddBodyModal}><FontAwesomeIcon icon={faPlus} /> Add</button>
                    <button className="dinosatNBBodySimBtnLong dinosatNBBodySimBtnSecondary" onClick={() => setBodies([])}><FontAwesomeIcon icon={faTrash} /> Clear</button>
                  </div>
                  <div className="nbody-body-list">
                    {bodies.map(body => (
                      <div key={body.id} className={`nbody-body-item ${selectedBody === body.id ? "selected" : ""} ${body.isDebris ? "debris" : ""}`} onClick={() => setSelectedBody(body.id)}>
                        <div className="nbody-body-color" style={{ backgroundColor: body.isDebris ? '#666' : body.color }} />
                        <div className="nbody-body-info"><span className="nbody-body-name">{body.name}{body.isDebris ? ' ☁️' : ''}</span></div>
                        <div className="nbody-body-actions">
                          <button onClick={(e) => { e.stopPropagation(); setFocusedBody(focusedBody === body.id ? null : body.id); }} className={focusedBody === body.id ? "active" : ""}><FontAwesomeIcon icon={faCrosshairs} /></button>
                          <button onClick={(e) => { e.stopPropagation(); updateBody(body.id, { visible: !body.visible }); }}><FontAwesomeIcon icon={body.visible ? faEye : faEyeSlash} /></button>
                          <button onClick={(e) => { e.stopPropagation(); if (!isRunning) setEditBodyModal({ ...body, mass: body.gm / G_CODATA }); }} disabled={isRunning} style={{ opacity: isRunning ? 0.4 : 1, cursor: isRunning ? 'not-allowed' : 'pointer' }}><FontAwesomeIcon icon={faEdit} /></button>
                          <button onClick={(e) => { e.stopPropagation(); removeBody(body.id); }} className="danger" disabled={isRunning} style={{ opacity: isRunning ? 0.4 : 1, cursor: isRunning ? 'not-allowed' : 'pointer' }}><FontAwesomeIcon icon={faTrash} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dinosatNBBodySimControlActions">
                  <button className="dinosatNBBodySimBtn dinosatNBBodySimBtnPrimary" onClick={() => setBodies([])}><FontAwesomeIcon icon={faRedo} /> Reset</button>
                  <button className="dinosatNBBodySimBtn dinosatNBBodySimBtnSecondary" onClick={() => setHudVisible(!hudVisible)}><FontAwesomeIcon icon={faChartLine} /> Stats HUD</button>
                </div>
              </div>
              {selectedBodyData && (
                <div className="nbody-controls-section">
                  <div className="nbody-section-header"><FontAwesomeIcon icon={faRocket} /> {selectedBodyData.name}</div>
                  <div className="nbody-detail-grid">
                    <div className="nbody-detail-item"><span>Pos X</span><span>{formatNumber(selectedBodyData.x / AU)} AU</span></div>
                    <div className="nbody-detail-item"><span>Pos Y</span><span>{formatNumber(selectedBodyData.y / AU)} AU</span></div>
                    <div className="nbody-detail-item"><span>Pos Z</span><span>{formatNumber(selectedBodyData.z / AU)} AU</span></div>
                    <div className="nbody-detail-item"><span>Vel X</span><span>{formatNumber(selectedBodyData.vx / 1000)} km/s</span></div>
                    <div className="nbody-detail-item"><span>Vel Y</span><span>{formatNumber(selectedBodyData.vy / 1000)} km/s</span></div>
                    <div className="nbody-detail-item"><span>Vel Z</span><span>{formatNumber(selectedBodyData.vz / 1000)} km/s</span></div>
                    <div className="nbody-detail-item"><span>Speed</span><span>{formatNumber(Math.sqrt(selectedBodyData.vx ** 2 + selectedBodyData.vy ** 2 + selectedBodyData.vz ** 2) / 1000)} km/s</span></div>
                    <div className="nbody-detail-item"><span>Mass</span><span>{formatNumber(selectedBodyData.gm / G_CODATA)} kg</span></div>
                  </div>
                  {selectedBodyOrbital && (
                    <>
                      <div className="nbody-section-subheader">Orbital Elements (Osculating)<span className={`nbody-orbit-type-label ${getOrbitTypeClass(selectedBodyOrbital.orbitType)}`}>({selectedBodyOrbital.orbitType})</span></div>
                      <div className="nbody-detail-grid">
                        {selectedBodyOrbital.orbitType !== "hyperbolic" && (<div className="nbody-detail-item"><span>Semi-Major</span><span>{formatNumber(selectedBodyOrbital.semiMajorAxis / AU)} AU</span></div>)}
                        {selectedBodyOrbital.orbitType === "hyperbolic" && (<div className="nbody-detail-item"><span>|Semi-Major|</span><span>{formatNumber(Math.abs(selectedBodyOrbital.semiMajorAxis) / AU)} AU</span></div>)}
                        <div className="nbody-detail-item"><span>Eccentricity</span><span>{formatNumber(selectedBodyOrbital.eccentricity, 4)}</span></div>
                        <div className="nbody-detail-item"><span>Inclination</span><span>{formatNumber(selectedBodyOrbital.inclination)}°</span></div>
                        {selectedBodyOrbital.orbitType !== "hyperbolic" && selectedBodyOrbital.orbitType !== "parabolic" && (<div className="nbody-detail-item"><span>Period</span><span>{formatTime(selectedBodyOrbital.period)}</span></div>)}
                        {selectedBodyOrbital.orbitType === "hyperbolic" && (<div className="nbody-detail-item"><span>V∞</span><span>{formatNumber(Math.sqrt(-selectedBodyData.gm / selectedBodyOrbital.semiMajorAxis) / 1000, 2)} km/s</span></div>)}
                        {selectedBodyOrbital.orbitType !== "hyperbolic" && (<div className="nbody-detail-item"><span>Apoapsis</span><span>{formatNumber(selectedBodyOrbital.apoapsis / AU)} AU</span></div>)}
                        <div className="nbody-detail-item"><span>Periapsis</span><span>{formatNumber(Math.abs(selectedBodyOrbital.periapsis) / AU)} AU</span></div>
                      </div>
                      {selectedBodyOrbital.orbitType === "hyperbolic" && (<div className="nbody-hyperbolic-warning">Unbound trajectory - will escape system</div>)}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="nbody-main-view">
          <div className="nbody-header">
            <div className="nbody-playback-controls">
              <button className="nbody-playback-btn" onClick={() => setIsRunning(!isRunning)}><FontAwesomeIcon icon={isRunning ? faPause : faPlay} /></button>
              <button className="nbody-playback-btn" onClick={resetSimulation}><FontAwesomeIcon icon={faRedo} /></button>
              {SPEED_OPTIONS.map(opt => (<button key={opt.label} className={`nbody-speed-btn ${speedMultiplier === opt.value ? "active" : ""}`} onClick={() => setSpeedMultiplier(opt.value)}>{opt.label}</button>))}
              <div className="nbody-time-display">T+ {formatTime(simulationTime)}</div>
              <button className={`nbody-playback-btn ${hudVisible ? "active" : ""}`} onClick={() => setHudVisible(!hudVisible)}><FontAwesomeIcon icon={faChartLine} /> HUD</button>
            </div>
          </div>
          <div ref={mountRef} className="nbody-canvas-container" />
          {pnWarnings.length > 0 && (
            <div className="nbody-pn-warnings">
              {pnWarnings.map((w, idx) => (
                <div key={idx} className="nbody-pn-warning-item">⚠️ {w.message} ({w.bodies.join(' ↔ ')})</div>
              ))}
            </div>
          )}
          {systemStats.rocheViolations && systemStats.rocheViolations.length > 0 && (
            <div className="nbody-roche-warnings">
              {systemStats.rocheViolations.map((v, idx) => (
                <div key={idx} className="nbody-roche-warning-item">⚠️ Roche Limit: {v.secondaryName} inside Roche limit of {v.primaryName} ({(v.ratio * 100).toFixed(1)}%)</div>
              ))}
            </div>
          )}
          <div className="nbody-view-controls">
            <div className="nbody-panel-header"><span>View Controls</span></div>
            <div className="nbody-panel-content">
              <button className={`nbody-view-btn ${showTrails ? "active" : ""}`} onClick={() => setShowTrails(!showTrails)}>Trails</button>
              <button className={`nbody-view-btn ${showLabels ? "active" : ""}`} onClick={() => setShowLabels(!showLabels)}>Labels</button>
              <button className={`nbody-view-btn ${showVectors ? "active" : ""}`} onClick={() => setShowVectors(!showVectors)}>Vectors</button>
              <button className={`nbody-view-btn ${showGrid ? "active" : ""}`} onClick={() => setShowGrid(!showGrid)}>Grid</button>
              <button className="nbody-view-btn" onClick={() => { if (cameraRef.current) { cameraRef.current.position.set(100, 60, 100); cameraRef.current.lookAt(0, 0, 0); } }}>Reset Cam</button>
            </div>
          </div>
          {hudVisible && (
            <div ref={hudPanelRef} className="nbody-hud-panel" style={{ transform: `translate(calc(-50% + ${hudPosition.x}px), calc(-50% + ${hudPosition.y}px))` }} onMouseDown={handleHudMouseDown}>
              <div className="nbody-hud-header"><span>System Statistics</span><button className="nbody-close-btn" onClick={() => setHudVisible(false)}><FontAwesomeIcon icon={faXmarkSquare} /></button></div>
              <div className="nbody-hud-content">
                <div className="nbody-hud-section">
                  <h4>Energy Conservation</h4>
                  <div className="nbody-hud-grid">
                    <div className="nbody-hud-item"><span>Total Energy</span><span>{formatNumber(systemStats.totalEnergy)} J</span></div>
                    <div className="nbody-hud-item"><span>Kinetic</span><span>{formatNumber(systemStats.kineticEnergy)} J</span></div>
                    <div className="nbody-hud-item"><span>Potential</span><span>{formatNumber(systemStats.potentialEnergy)} J</span></div>
                    {physicsConfig.includeGR && (<div className="nbody-hud-item"><span>Relativistic</span><span>{formatNumber(systemStats.relativisticEnergy)} J</span></div>)}
                    <div className="nbody-hud-item"><span>Energy Drift</span><span className={getEnergyDriftClass(systemStats.energyDrift)}>{formatNumber(systemStats.energyDrift, 4)}%{physicsConfig.includeGR && <small title="1PN energy is approximate - drift may not reflect true integration error"> *</small>}</span></div>
                  </div>
                </div>
                <div className="nbody-hud-section">
                  <h4>Momentum</h4>
                  <div className="nbody-hud-grid">
                    <div className="nbody-hud-item"><span>P<sub>x</sub></span><span>{formatNumber(systemStats.totalMomentum.x)} kg·m/s</span></div>
                    <div className="nbody-hud-item"><span>P<sub>y</sub></span><span>{formatNumber(systemStats.totalMomentum.y)} kg·m/s</span></div>
                    <div className="nbody-hud-item"><span>P<sub>z</sub></span><span>{formatNumber(systemStats.totalMomentum.z)} kg·m/s</span></div>
                  </div>
                </div>
                <div className="nbody-hud-section">
                  <h4>Center of Mass</h4>
                  <div className="nbody-hud-grid">
                    <div className="nbody-hud-item"><span>X</span><span>{formatNumber(systemStats.centerOfMass.x / AU)} AU</span></div>
                    <div className="nbody-hud-item"><span>Y</span><span>{formatNumber(systemStats.centerOfMass.y / AU)} AU</span></div>
                    <div className="nbody-hud-item"><span>Z</span><span>{formatNumber(systemStats.centerOfMass.z / AU)} AU</span></div>
                  </div>
                </div>
                <div className="nbody-hud-section">
                  <h4>Performance</h4>
                  <div className="nbody-hud-grid">
                    <div className="nbody-hud-item"><span>FPS</span><span>{actualFps}</span></div>
                    <div className="nbody-hud-item"><span>Bodies</span><span>{systemStats.bodyCount}</span></div>
                    <div className="nbody-hud-item"><span>Integrator</span><span className={getStatusOnClass()}>{integrator === INTEGRATORS.RK5 ? 'RK5' : integrator.toUpperCase()}</span></div>
                    <div className="nbody-hud-item"><span>Timestep</span><span className={getStatusOnClass()}>{physicsConfig.timestepMethod === 'fixed' ? "FIXED" : physicsConfig.timestepMethod.toUpperCase()}</span></div>
                    <div className="nbody-hud-item"><span>Normalized</span><span className={physicsConfig.useNormalizedUnits ? getStatusOnClass() : getStatusOffClass()}>{physicsConfig.useNormalizedUnits ? "ON" : "OFF"}</span></div>
                    <div className="nbody-hud-item"><span>Barycentric</span><span className={physicsConfig.barycentricCorrection ? getStatusOnClass() : getStatusOffClass()}>{physicsConfig.barycentricCorrection ? "ON" : "OFF"}</span></div>
                    <div className="nbody-hud-item"><span>Collisions</span><span className={physicsConfig.collisionMode !== 'none' ? getStatusOnClass() : getStatusOffClass()}>{physicsConfig.collisionMode === 'none' ? 'OFF' : `MERGE${physicsConfig.collisionMassLoss > 0 ? ` -${(physicsConfig.collisionMassLoss * 100).toFixed(0)}%` : ''}`}</span></div>
                    <div className="nbody-hud-item"><span>Roche</span><span className={physicsConfig.enableRocheLimit ? getStatusOnClass() : getStatusOffClass()}>{physicsConfig.enableRocheLimit ? (physicsConfig.rocheDisruptionMode === 'disrupt' ? 'DEBRIS' : 'WARNING') : "OFF"}</span></div>
                    <div className="nbody-hud-item"><span>Softening</span><span className={softeningConfig.enabled ? "nbody-status-warning" : getStatusOffClass()}>{softeningConfig.enabled ? softeningConfig.mode.toUpperCase() : "OFF"}</span></div>
                    <div className="nbody-hud-item"><span>GR</span><span className={physicsConfig.includeGR ? getStatusOnClass() : getStatusOffClass()}>{physicsConfig.includeGR ? (physicsConfig.grMode === '2.5pn' ? (physicsConfig.relativisticMode ? (physicsConfig.retardedGravity ? `RET c/${physicsConfig.cReductionFactor}` : `2.5PN c/${physicsConfig.cReductionFactor}`) : "2.5PN+GW") : "1PN") : "OFF"}</span></div>
                    <div className="nbody-hud-item"><span>J2</span><span className={physicsConfig.includeJ2 ? getStatusOnClass() : getStatusOffClass()}>{physicsConfig.includeJ2 ? (physicsConfig.j2BackReaction ? "PRECESSING" : "FIXED") : "OFF"}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {addBodyModal && (
        <div className="nbody-modal-overlay" onClick={() => { setAddBodyModal(false); setAddBodyColorPickerOpen(false); }}>
          <div className="nbody-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nbody-modal-header"><span>Add Celestial Body</span><button className="nbody-close-btn" onClick={() => { setAddBodyModal(false); setAddBodyColorPickerOpen(false); }}><FontAwesomeIcon icon={faXmarkSquare} /></button></div>
            <div className="nbody-modal-content">
              {bodies.length === 0 && (<div className="nbody-modal-tip"><FontAwesomeIcon icon={faFlask} /><div><strong>Getting Started:</strong> Add a massive central body (like a star) at the origin to begin your simulation.</div></div>)}
              <div className="nbody-modal-section">
                <div className="nbody-modal-section-header"><FontAwesomeIcon icon={faGlobe} />Basic Properties</div>
                <div className="nbody-modal-section-content">
                  <div className="nbody-modal-grid nbody-modal-grid-2">
                    <div className="nbody-modal-field nbody-modal-field-wide"><label>Name</label><input type="text" value={newBody.name} onChange={(e) => setNewBody({ ...newBody, name: e.target.value })} placeholder="Enter body name" className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Mass (kg)</label><input type="number" value={newBody.mass} onChange={(e) => setNewBody({ ...newBody, mass: e.target.value })} className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Radius (m)</label><input type="number" value={newBody.radius} onChange={(e) => setNewBody({ ...newBody, radius: e.target.value })} className="nbody-input" /></div>
                  </div>
                  <div className="nbody-modal-color-row">
                    <label>Color</label>
                    <Tippy content={<DinoLabsColorPicker color={newBody.color} onChange={(c) => setNewBody({ ...newBody, color: c })} />} visible={addBodyColorPickerOpen} onClickOutside={() => setAddBodyColorPickerOpen(false)} interactive={true} placement="right" className="color-picker-tippy" appendTo={() => document.body}>
                      <div className="nbody-color-picker-swatch" onClick={() => setAddBodyColorPickerOpen((prev) => !prev)} style={{ backgroundColor: newBody.color }} />
                    </Tippy>
                  </div>
                </div>
              </div>
              {bodies.length > 0 && (
                <div className="nbody-modal-section">
                  <div className="nbody-modal-section-header"><FontAwesomeIcon icon={faRocket} />Trajectory Configuration</div>
                  <div className="nbody-modal-section-content">
                    <div className="nbody-modal-grid nbody-modal-grid-2">
                      <div className="nbody-modal-field nbody-modal-field-wide">
                        <label>Trajectory Mode</label>
                        <select value={trajectoryMode} onChange={(e) => setTrajectoryMode(e.target.value)} className="nbody-select">
                          <option value="orbit">Orbital (Bound Trajectory)</option>
                          <option value="flyby">Flyby / Gravity Assist</option>
                          <option value="interstellar">Interstellar Object</option>
                          <option value="manual">Manual Entry</option>
                        </select>
                      </div>
                    </div>
                    {trajectoryMode === "orbit" && (
                      <>
                        <div className="nbody-modal-grid nbody-modal-grid-2" style={{ marginTop: '0.75rem' }}>
                          <div className="nbody-modal-field"><label>Central Body</label><select value={orbitConfig.centralBodyId || ""} onChange={(e) => setOrbitConfig({ ...orbitConfig, centralBodyId: e.target.value || null })} className="nbody-select"><option value="">Select body...</option>{bodies.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}</select></div>
                          <div className="nbody-modal-field"><label>Orbit Type</label><select value={orbitConfig.orbitType} onChange={(e) => setOrbitConfig({ ...orbitConfig, orbitType: e.target.value })} className="nbody-select"><option value="circular">Circular (e=0)</option><option value="elliptical">Elliptical (0&lt;e&lt;1)</option><option value="parabolic">Parabolic (e=1)</option><option value="hyperbolic">Hyperbolic (e&gt;1)</option></select></div>
                          <div className="nbody-modal-field"><label>Periapsis (AU)</label><input type="number" value={orbitConfig.distance / AU} onChange={(e) => setOrbitConfig({ ...orbitConfig, distance: (parseFloat(e.target.value) || 1) * AU })} className="nbody-input" step="0.1" /></div>
                          {(orbitConfig.orbitType === "elliptical" || orbitConfig.orbitType === "hyperbolic") && (<div className="nbody-modal-field"><label>Eccentricity</label><input type="number" value={orbitConfig.eccentricity} onChange={(e) => setOrbitConfig({ ...orbitConfig, eccentricity: parseFloat(e.target.value) || 0 })} className="nbody-input" step="0.1" /></div>)}
                          <div className="nbody-modal-field"><label>Inclination (°)</label><input type="number" value={orbitConfig.inclination} onChange={(e) => setOrbitConfig({ ...orbitConfig, inclination: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                          <div className="nbody-modal-field"><label>True Anomaly (°)</label><input type="number" value={orbitConfig.trueAnomaly} onChange={(e) => setOrbitConfig({ ...orbitConfig, trueAnomaly: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                          <div className="nbody-modal-field"><label>RAAN Ω (°)</label><input type="number" value={orbitConfig.longitudeOfAscendingNode} onChange={(e) => setOrbitConfig({ ...orbitConfig, longitudeOfAscendingNode: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                          <div className="nbody-modal-field"><label>Arg. Periapsis ω (°)</label><input type="number" value={orbitConfig.argumentOfPeriapsis} onChange={(e) => setOrbitConfig({ ...orbitConfig, argumentOfPeriapsis: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                          <div className="nbody-modal-field"><label>Direction</label><select value={orbitConfig.prograde ? "prograde" : "retrograde"} onChange={(e) => setOrbitConfig({ ...orbitConfig, prograde: e.target.value === "prograde" })} className="nbody-select"><option value="prograde">Prograde (CCW)</option><option value="retrograde">Retrograde (CW)</option></select></div>
                        </div>
                        {orbitConfig.centralBodyId && (<div className="nbody-modal-calculated"><div className="nbody-modal-calculated-item"><span>Orbital Info</span><span>{getOrbitalInfo(bodies.find(b => b.id === orbitConfig.centralBodyId), orbitConfig)}</span></div></div>)}
                      </>
                    )}
                    {trajectoryMode === "flyby" && (
                      <>
                        <div className="nbody-modal-tip nbody-modal-info-flyby" style={{ marginTop: '0.75rem' }}><FontAwesomeIcon icon={faRocket} /><div><strong>Flyby Trajectory:</strong> Object approaches target on a hyperbolic path for gravity assist maneuvers.</div></div>
                        <div className="nbody-modal-grid nbody-modal-grid-2" style={{ marginTop: '0.5rem' }}>
                          <div className="nbody-modal-field"><label>Target Body</label><select value={flybyConfig.targetBodyId || ""} onChange={(e) => setFlybyConfig({ ...flybyConfig, targetBodyId: e.target.value || null })} className="nbody-select"><option value="">Select body...</option>{bodies.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}</select></div>
                          <div className="nbody-modal-field"><label>Phase</label><select value={flybyConfig.inbound ? "inbound" : "outbound"} onChange={(e) => setFlybyConfig({ ...flybyConfig, inbound: e.target.value === "inbound" })} className="nbody-select"><option value="inbound">Inbound</option><option value="outbound">Outbound</option></select></div>
                          <div className="nbody-modal-field"><label>V∞ (km/s)</label><input type="number" value={flybyConfig.vInfinity / 1000} onChange={(e) => setFlybyConfig({ ...flybyConfig, vInfinity: (parseFloat(e.target.value) || 10) * 1000 })} className="nbody-input" step="1" /></div>
                          <div className="nbody-modal-field"><label>Periapsis (AU)</label><input type="number" value={flybyConfig.periapsisDistance / AU} onChange={(e) => setFlybyConfig({ ...flybyConfig, periapsisDistance: (parseFloat(e.target.value) || 0.1) * AU })} className="nbody-input" step="0.01" /></div>
                          <div className="nbody-modal-field"><label>Approach Angle (°)</label><input type="number" value={flybyConfig.approachAngle} onChange={(e) => setFlybyConfig({ ...flybyConfig, approachAngle: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                          <div className="nbody-modal-field"><label>Inclination (°)</label><input type="number" value={flybyConfig.inclination} onChange={(e) => setFlybyConfig({ ...flybyConfig, inclination: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                          <div className="nbody-modal-field nbody-modal-field-wide"><label>Start Distance (AU)</label><input type="number" value={flybyConfig.startDistance / AU} onChange={(e) => setFlybyConfig({ ...flybyConfig, startDistance: (parseFloat(e.target.value) || 5) * AU })} className="nbody-input" step="0.5" /></div>
                        </div>
                        {flybyConfig.targetBodyId && (() => { const tb = bodies.find(b => b.id === flybyConfig.targetBodyId); const state = tb ? calculateFlybyState(tb, flybyConfig) : null; if (!state) return null; return (<div className="nbody-modal-calculated"><div className="nbody-modal-calculated-item"><span>Eccentricity</span><span>{formatNumber(state.eccentricity, 3)}</span></div><div className="nbody-modal-calculated-item"><span>Deflection</span><span>{formatNumber(state.deflectionAngle, 1)}°</span></div><div className="nbody-modal-calculated-item"><span>V Periapsis</span><span>{formatNumber(state.periapsisVelocity / 1000, 2)} km/s</span></div><div className="nbody-modal-calculated-item"><span>Impact Param</span><span>{formatNumber(state.impactParameter / AU, 3)} AU</span></div></div>); })()}
                      </>
                    )}
                    {trajectoryMode === "interstellar" && (
                      <>
                        <div className="nbody-modal-tip nbody-modal-info-interstellar" style={{ marginTop: '0.75rem' }}><FontAwesomeIcon icon={faGlobe} /><div><strong>Interstellar Object:</strong> Simulates objects entering the system from interstellar space on unbound trajectories.</div></div>
                        <div className="nbody-modal-grid nbody-modal-grid-2" style={{ marginTop: '0.5rem' }}>
                          <div className="nbody-modal-field"><label>Reference Body</label><select value={interstellarConfig.referenceBodyId || ""} onChange={(e) => setInterstellarConfig({ ...interstellarConfig, referenceBodyId: e.target.value || null })} className="nbody-select"><option value="">Select body...</option>{bodies.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}</select></div>
                          <div className="nbody-modal-field"><label>V∞ (km/s)</label><input type="number" value={interstellarConfig.vInfinity / 1000} onChange={(e) => setInterstellarConfig({ ...interstellarConfig, vInfinity: (parseFloat(e.target.value) || 26) * 1000 })} className="nbody-input" step="1" /></div>
                          <div className="nbody-modal-field"><label>Periapsis (AU)</label><input type="number" value={interstellarConfig.periapsisDistance / AU} onChange={(e) => setInterstellarConfig({ ...interstellarConfig, periapsisDistance: (parseFloat(e.target.value) || 1) * AU })} className="nbody-input" step="0.1" /></div>
                          <div className="nbody-modal-field"><label>Approach Angle (°)</label><input type="number" value={interstellarConfig.approachAngle} onChange={(e) => setInterstellarConfig({ ...interstellarConfig, approachAngle: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                          <div className="nbody-modal-field"><label>Inclination (°)</label><input type="number" value={interstellarConfig.inclination} onChange={(e) => setInterstellarConfig({ ...interstellarConfig, inclination: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                          <div className="nbody-modal-field"><label>Start Distance (AU)</label><input type="number" value={interstellarConfig.startDistance / AU} onChange={(e) => setInterstellarConfig({ ...interstellarConfig, startDistance: (parseFloat(e.target.value) || 50) * AU })} className="nbody-input" step="5" /></div>
                        </div>
                        {interstellarConfig.referenceBodyId && (() => { const rb = bodies.find(b => b.id === interstellarConfig.referenceBodyId); const state = rb ? calculateInterstellarState(rb, interstellarConfig) : null; if (!state) return null; return (<div className="nbody-modal-calculated"><div className="nbody-modal-calculated-item"><span>Eccentricity</span><span>{formatNumber(state.eccentricity, 3)}</span></div><div className="nbody-modal-calculated-item"><span>V Periapsis</span><span>{formatNumber(state.periapsisVelocity / 1000, 2)} km/s</span></div></div>); })()}
                      </>
                    )}
                    {trajectoryMode === "manual" && (
                      <div className="nbody-modal-grid nbody-modal-grid-3" style={{ marginTop: '0.75rem' }}>
                        <div className="nbody-modal-field"><label>Position X (m)</label><input type="number" value={newBody.x} onChange={(e) => setNewBody({ ...newBody, x: e.target.value })} className="nbody-input" /></div>
                        <div className="nbody-modal-field"><label>Position Y (m)</label><input type="number" value={newBody.y} onChange={(e) => setNewBody({ ...newBody, y: e.target.value })} className="nbody-input" /></div>
                        <div className="nbody-modal-field"><label>Position Z (m)</label><input type="number" value={newBody.z} onChange={(e) => setNewBody({ ...newBody, z: e.target.value })} className="nbody-input" /></div>
                        <div className="nbody-modal-field"><label>Velocity X (m/s)</label><input type="number" value={newBody.vx} onChange={(e) => setNewBody({ ...newBody, vx: e.target.value })} className="nbody-input" /></div>
                        <div className="nbody-modal-field"><label>Velocity Y (m/s)</label><input type="number" value={newBody.vy} onChange={(e) => setNewBody({ ...newBody, vy: e.target.value })} className="nbody-input" /></div>
                        <div className="nbody-modal-field"><label>Velocity Z (m/s)</label><input type="number" value={newBody.vz} onChange={(e) => setNewBody({ ...newBody, vz: e.target.value })} className="nbody-input" /></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(trajectoryMode === "manual" || bodies.length === 0) && bodies.length === 0 && (
                <div className="nbody-modal-section">
                  <div className="nbody-modal-section-header"><FontAwesomeIcon icon={faCrosshairs} />Initial State</div>
                  <div className="nbody-modal-section-content">
                    <div className="nbody-modal-grid nbody-modal-grid-3">
                      <div className="nbody-modal-field"><label>Position X (m)</label><input type="number" value={newBody.x} onChange={(e) => setNewBody({ ...newBody, x: e.target.value })} className="nbody-input" /></div>
                      <div className="nbody-modal-field"><label>Position Y (m)</label><input type="number" value={newBody.y} onChange={(e) => setNewBody({ ...newBody, y: e.target.value })} className="nbody-input" /></div>
                      <div className="nbody-modal-field"><label>Position Z (m)</label><input type="number" value={newBody.z} onChange={(e) => setNewBody({ ...newBody, z: e.target.value })} className="nbody-input" /></div>
                      <div className="nbody-modal-field"><label>Velocity X (m/s)</label><input type="number" value={newBody.vx} onChange={(e) => setNewBody({ ...newBody, vx: e.target.value })} className="nbody-input" /></div>
                      <div className="nbody-modal-field"><label>Velocity Y (m/s)</label><input type="number" value={newBody.vy} onChange={(e) => setNewBody({ ...newBody, vy: e.target.value })} className="nbody-input" /></div>
                      <div className="nbody-modal-field"><label>Velocity Z (m/s)</label><input type="number" value={newBody.vz} onChange={(e) => setNewBody({ ...newBody, vz: e.target.value })} className="nbody-input" /></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="nbody-modal-section">
                <div className="nbody-modal-section-header"><FontAwesomeIcon icon={faCog} />Oblateness (J2) & Spin</div>
                <div className="nbody-modal-section-content">
                  <div className="nbody-physics-warning">Spin axis will precess under torque if J2 back-reaction is enabled.</div>
                  <div className="nbody-modal-grid nbody-modal-grid-4">
                    <div className="nbody-modal-field"><label>J2 (×10⁻³)</label><input type="number" value={(newBody.j2 || 0) * 1000} onChange={(e) => setNewBody({ ...newBody, j2: (parseFloat(e.target.value) || 0) / 1000 })} className="nbody-input" step="0.001" placeholder="1.083" /></div>
                    <div className="nbody-modal-field"><label>Eq. Radius (m)</label><input type="number" value={newBody.j2Radius || ''} onChange={(e) => setNewBody({ ...newBody, j2Radius: parseFloat(e.target.value) || null })} className="nbody-input" placeholder="Optional" /></div>
                    <div className="nbody-modal-field"><label>Spin Rate (rad/s)</label><input type="number" value={newBody.spinRate || ''} onChange={(e) => setNewBody({ ...newBody, spinRate: parseFloat(e.target.value) || 0 })} className="nbody-input" step="0.0001" placeholder="7.29e-5" /></div>
                    <div className="nbody-modal-field"><label>MoI Factor</label><input type="number" value={newBody.momentOfInertiaFactor || 0.4} onChange={(e) => setNewBody({ ...newBody, momentOfInertiaFactor: parseFloat(e.target.value) || 0.4 })} className="nbody-input" step="0.01" placeholder="0.4" /></div>
                    <div className="nbody-modal-field"><label>Spin Axis X</label><input type="number" value={newBody.spinAxisX} onChange={(e) => setNewBody({ ...newBody, spinAxisX: parseFloat(e.target.value) || 0 })} className="nbody-input" step="0.1" /></div>
                    <div className="nbody-modal-field"><label>Spin Axis Y</label><input type="number" value={newBody.spinAxisY} onChange={(e) => setNewBody({ ...newBody, spinAxisY: parseFloat(e.target.value) || 0 })} className="nbody-input" step="0.1" /></div>
                    <div className="nbody-modal-field"><label>Spin Axis Z</label><input type="number" value={newBody.spinAxisZ} onChange={(e) => setNewBody({ ...newBody, spinAxisZ: parseFloat(e.target.value) || 1 })} className="nbody-input" step="0.1" /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="nbody-modal-footer">
              <button className="nbody-modal-btn cancel" onClick={() => { setAddBodyModal(false); setAddBodyColorPickerOpen(false); }}>Cancel</button>
              <button className="nbody-modal-btn confirm" onClick={addBody}><FontAwesomeIcon icon={faPlus} /> Add Body</button>
            </div>
          </div>
        </div>
      )}

      {editBodyModal && (
        <div className="nbody-modal-overlay" onClick={() => { setEditBodyModal(null); setEditBodyColorPickerOpen(false); }}>
          <div className="nbody-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nbody-modal-header"><span>Edit: {editBodyModal.name}</span><button className="nbody-close-btn" onClick={() => { setEditBodyModal(null); setEditBodyColorPickerOpen(false); }}><FontAwesomeIcon icon={faXmarkSquare} /></button></div>
            <div className="nbody-modal-content">
              <div className="nbody-modal-section">
                <div className="nbody-modal-section-header"><FontAwesomeIcon icon={faGlobe} />Basic Properties</div>
                <div className="nbody-modal-section-content">
                  <div className="nbody-modal-grid nbody-modal-grid-2">
                    <div className="nbody-modal-field nbody-modal-field-wide"><label>Name</label><input type="text" value={editBodyModal.name} onChange={(e) => setEditBodyModal({ ...editBodyModal, name: e.target.value })} className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Mass (kg)</label><input type="number" value={editBodyModal.mass} onChange={(e) => setEditBodyModal({ ...editBodyModal, mass: e.target.value })} className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Radius (m)</label><input type="number" value={editBodyModal.radius} onChange={(e) => setEditBodyModal({ ...editBodyModal, radius: e.target.value })} className="nbody-input" /></div>
                  </div>
                  <div className="nbody-modal-color-row">
                    <label>Color</label>
                    <Tippy content={<DinoLabsColorPicker color={editBodyModal.color} onChange={(c) => setEditBodyModal({ ...editBodyModal, color: c })} />} visible={editBodyColorPickerOpen} onClickOutside={() => setEditBodyColorPickerOpen(false)} interactive={true} placement="right" className="color-picker-tippy" appendTo={() => document.body}>
                      <div className="nbody-color-picker-swatch" onClick={() => setEditBodyColorPickerOpen((prev) => !prev)} style={{ backgroundColor: editBodyModal.color }} />
                    </Tippy>
                  </div>
                </div>
              </div>
              <div className="nbody-modal-section">
                <div className="nbody-modal-section-header"><FontAwesomeIcon icon={faCrosshairs} />Position & Velocity</div>
                <div className="nbody-modal-section-content">
                  <div className="nbody-modal-grid nbody-modal-grid-3">
                    <div className="nbody-modal-field"><label>Position X (m)</label><input type="number" value={editBodyModal.x} onChange={(e) => setEditBodyModal({ ...editBodyModal, x: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Position Y (m)</label><input type="number" value={editBodyModal.y} onChange={(e) => setEditBodyModal({ ...editBodyModal, y: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Position Z (m)</label><input type="number" value={editBodyModal.z} onChange={(e) => setEditBodyModal({ ...editBodyModal, z: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Velocity X (m/s)</label><input type="number" value={editBodyModal.vx} onChange={(e) => setEditBodyModal({ ...editBodyModal, vx: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Velocity Y (m/s)</label><input type="number" value={editBodyModal.vy} onChange={(e) => setEditBodyModal({ ...editBodyModal, vy: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                    <div className="nbody-modal-field"><label>Velocity Z (m/s)</label><input type="number" value={editBodyModal.vz} onChange={(e) => setEditBodyModal({ ...editBodyModal, vz: parseFloat(e.target.value) || 0 })} className="nbody-input" /></div>
                  </div>
                </div>
              </div>
              <div className="nbody-modal-section">
                <div className="nbody-modal-section-header"><FontAwesomeIcon icon={faCog} />Oblateness (J2) & Spin</div>
                <div className="nbody-modal-section-content">
                  <div className="nbody-physics-warning">Spin axis will precess under torque if J2 back-reaction is enabled.</div>
                  <div className="nbody-modal-grid nbody-modal-grid-4">
                    <div className="nbody-modal-field"><label>J2 (×10⁻³)</label><input type="number" value={(editBodyModal.j2 || 0) * 1000} onChange={(e) => setEditBodyModal({ ...editBodyModal, j2: (parseFloat(e.target.value) || 0) / 1000 })} className="nbody-input" step="0.001" placeholder="1.083" /></div>
                    <div className="nbody-modal-field"><label>Eq. Radius (m)</label><input type="number" value={editBodyModal.j2Radius || ''} onChange={(e) => setEditBodyModal({ ...editBodyModal, j2Radius: parseFloat(e.target.value) || null })} className="nbody-input" placeholder="Optional" /></div>
                    <div className="nbody-modal-field"><label>Spin Rate (rad/s)</label><input type="number" value={editBodyModal.spinRate || ''} onChange={(e) => setEditBodyModal({ ...editBodyModal, spinRate: parseFloat(e.target.value) || 0 })} className="nbody-input" step="0.0001" placeholder="7.29e-5" /></div>
                    <div className="nbody-modal-field"><label>MoI Factor</label><input type="number" value={editBodyModal.momentOfInertiaFactor || 0.4} onChange={(e) => setEditBodyModal({ ...editBodyModal, momentOfInertiaFactor: parseFloat(e.target.value) || 0.4 })} className="nbody-input" step="0.01" placeholder="0.4" /></div>
                    <div className="nbody-modal-field"><label>Spin Axis X</label><input type="number" value={editBodyModal.spinAxisX || 0} onChange={(e) => setEditBodyModal({ ...editBodyModal, spinAxisX: parseFloat(e.target.value) || 0 })} className="nbody-input" step="0.1" /></div>
                    <div className="nbody-modal-field"><label>Spin Axis Y</label><input type="number" value={editBodyModal.spinAxisY || 0} onChange={(e) => setEditBodyModal({ ...editBodyModal, spinAxisY: parseFloat(e.target.value) || 0 })} className="nbody-input" step="0.1" /></div>
                    <div className="nbody-modal-field"><label>Spin Axis Z</label><input type="number" value={editBodyModal.spinAxisZ || 1} onChange={(e) => setEditBodyModal({ ...editBodyModal, spinAxisZ: parseFloat(e.target.value) || 1 })} className="nbody-input" step="0.1" /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="nbody-modal-footer">
              <button className="nbody-modal-btn cancel" onClick={() => { setEditBodyModal(null); setEditBodyColorPickerOpen(false); }}>Cancel</button>
              <button className="nbody-modal-btn confirm" onClick={() => {
                const spinMag = Math.sqrt((parseFloat(editBodyModal.spinAxisX) || 0) ** 2 + (parseFloat(editBodyModal.spinAxisY) || 0) ** 2 + (parseFloat(editBodyModal.spinAxisZ) || 1) ** 2);
                updateBody(editBodyModal.id, {
                  name: editBodyModal.name,
                  gm: (parseFloat(editBodyModal.mass) || 1) * G_CODATA,
                  radius: parseFloat(editBodyModal.radius) || EARTH_RADIUS_MEAN,
                  x: parseFloat(editBodyModal.x) || 0,
                  y: parseFloat(editBodyModal.y) || 0,
                  z: parseFloat(editBodyModal.z) || 0,
                  vx: parseFloat(editBodyModal.vx) || 0,
                  vy: parseFloat(editBodyModal.vy) || 0,
                  vz: parseFloat(editBodyModal.vz) || 0,
                  color: editBodyModal.color,
                  j2: editBodyModal.j2,
                  j2Radius: editBodyModal.j2Radius || null,
                  spinAxisX: (parseFloat(editBodyModal.spinAxisX) || 0) / (spinMag || 1),
                  spinAxisY: (parseFloat(editBodyModal.spinAxisY) || 0) / (spinMag || 1),
                  spinAxisZ: (parseFloat(editBodyModal.spinAxisZ) || 1) / (spinMag || 1),
                  spinRate: parseFloat(editBodyModal.spinRate) || 0,
                  momentOfInertiaFactor: parseFloat(editBodyModal.momentOfInertiaFactor) || 0.4,
                  errX: 0, errY: 0, errZ: 0,
                  errVx: 0, errVy: 0, errVz: 0,
                  isDebris: false,
                  positionHistory: null,
                  orientation: null,
                  omegaBody_x: 0,
                  omegaBody_y: 0
                });
                setEditBodyModal(null);
                setEditBodyColorPickerOpen(false);
              }}><FontAwesomeIcon icon={faEdit} /> Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}