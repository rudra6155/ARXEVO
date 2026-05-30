"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import styles from "./VaultNav.module.css";

// ─── Types ──────────────────────────────────────────────────────
type VaultState = "locked" | "unlocking" | "opening" | "open" | "closing";

const NAV_LABELS = ["ORIGIN", "ARCHETYPES", "PROTOCOL", "SHIELD", "INITIATE"] as const;
const PANEL_MAP: Record<string, number> = {
  ORIGIN: 0,
  ARCHETYPES: 1,
  PROTOCOL: 2,
  SHIELD: 3,
  INITIATE: 4,
};

// ─── Brand constants ────────────────────────────────────────────
const BLOOD = 0xc41e1e;
const BONE = 0xd4c9b0;
const GOLD = 0xb8960c;
const INK = 0x0a0a08;

export default function VaultNav() {
  const spiderRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const bloodFlashRef = useRef<HTMLDivElement>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unlockLabel, setUnlockLabel] = useState("DRAG TO UNLOCK");

  // Three.js refs
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const labelRendererRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const vaultGroupRef = useRef<any>(null);
  const dialRef = useRef<any>(null);
  const handleRef = useRef<any>(null);
  const doorGroupRef = useRef<any>(null);
  const goldBarsRef = useRef<any[]>([]);
  const labelObjectsRef = useRef<any[]>([]);
  const interiorLightRef = useRef<any>(null);
  const stateRef = useRef<VaultState>("locked");
  const dragAccumRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const disposablesRef = useRef<any[]>([]);
  const sceneInitializedRef = useRef(false);
  const threeRef = useRef<any>(null);

  // ─── Tick sound via Web Audio API ─────────────────────────────
  const playTickSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const actx = new AudioCtx();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, actx.currentTime);
      gain.gain.setValueAtTime(0.08, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.02);
      osc.start(actx.currentTime);
      osc.stop(actx.currentTime + 0.02);
    } catch {
      // Web Audio unavailable
    }
  }, []);

  // ─── Visibility trigger (scroll past panel 1) ────────────────
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();

    const threshold = window.innerWidth * 0.8;
    const onScroll = () => {
      setIsVisible(window.scrollY >= threshold);
      if (window.scrollY < threshold) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // ─── Spider bob animation ─────────────────────────────────────
  useEffect(() => {
    if (!spiderRef.current || !isVisible) return;
    const ctx = gsap.context(() => {
      gsap.to(spiderRef.current, {
        y: 8,
        yoyo: true,
        repeat: -1,
        duration: 2,
        ease: "sine.inOut",
      });
    });
    return () => ctx.revert();
  }, [isVisible]);

  // ─── Navigate to panel ────────────────────────────────────────
  const navigateToPanel = useCallback((label: string) => {
    const panelIndex = PANEL_MAP[label] ?? 0;
    const targetY = panelIndex * window.innerWidth;

    const closeAndScroll = () => {
      closeVault();
      setTimeout(() => {
        window.scrollTo({ top: targetY, behavior: "smooth" });
      }, 600);
    };

    if (stateRef.current === "open") {
      // Close vault animation
      stateRef.current = "closing";
      const door = doorGroupRef.current;
      const handle = handleRef.current;
      const dial = dialRef.current;

      if (door && handle && dial) {
        const tl = gsap.timeline({
          onComplete: () => {
            stateRef.current = "locked";
            dragAccumRef.current = 0;
            closeAndScroll();
          },
        });

        // Hide labels
        labelObjectsRef.current.forEach((obj) => {
          if (obj.element) obj.element.style.opacity = "0";
        });

        tl.to(handle.rotation, { z: 0, duration: 0.4, ease: "power2.inOut" }, 0);
        tl.to(door.rotation, { y: 0, duration: 0.8, ease: "power2.inOut" }, 0.1);

        goldBarsRef.current.forEach((bar) => {
          tl.to(bar.position, { z: -0.5, duration: 0.3 }, 0);
          tl.to(bar.material, { opacity: 0, duration: 0.3 }, 0);
        });

        tl.to(dial.rotation, { z: `+=${Math.PI * 4}`, duration: 0.5, ease: "power2.out" }, 0.3);

        if (interiorLightRef.current) {
          tl.to(interiorLightRef.current, { intensity: 0, duration: 0.5 }, 0);
        }

        // Blood flash
        if (bloodFlashRef.current) {
          tl.to(bloodFlashRef.current, { opacity: 0.6, duration: 0.1 }, 0.8);
          tl.to(bloodFlashRef.current, { opacity: 0, duration: 0.4 }, 0.9);
        }
      } else {
        closeAndScroll();
      }
    } else {
      window.scrollTo({ top: targetY, behavior: "smooth" });
      closeVault();
    }

    setMobileMenuOpen(false);
  }, []);

  // ─── Open vault overlay ───────────────────────────────────────
  const openVault = useCallback(() => {
    if (isExpanded) return;
    setIsExpanded(true);

    // Show unlock label after a beat
    setTimeout(() => setUnlockLabel("DRAG TO UNLOCK"), 800);
  }, [isExpanded]);

  // ─── Close vault overlay ──────────────────────────────────────
  const closeVault = useCallback(() => {
    if (!isExpanded) return;

    setIsExpanded(false);
    stateRef.current = "locked";
    dragAccumRef.current = 0;

    // Restart dial auto-rotation if available
    if (dialRef.current) {
      gsap.to(dialRef.current.rotation, {
        z: `+=${Math.PI * 2}`,
        repeat: -1,
        duration: 8,
        ease: "none",
      });
    }
    // Restart vault sway
    if (vaultGroupRef.current) {
      gsap.to(vaultGroupRef.current.rotation, {
        y: 0.05,
        yoyo: true,
        repeat: -1,
        duration: 3,
        ease: "sine.inOut",
      });
    }
  }, [isExpanded]);

  // ─── ESC key to close ─────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) closeVault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded, closeVault]);

  // ─── Three.js Scene Setup ────────────────────────────────────
  useEffect(() => {
    if (isMobile || !isVisible || !canvasRef.current || sceneInitializedRef.current) return;

    let cancelled = false;

    const initScene = async () => {
      // Lazy load Three.js
      const THREE = await import("three");
      const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
      const { MTLLoader } = await import("three/examples/jsm/loaders/MTLLoader.js");
      const { CSS2DRenderer, CSS2DObject } = await import(
        "three/examples/jsm/renderers/CSS2DRenderer.js"
      );

      if (cancelled || !canvasRef.current) return;

      threeRef.current = THREE;
      sceneInitializedRef.current = true;

      // ── Scene ──
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // ── Camera ──
      const camera = new THREE.PerspectiveCamera(45, 380 / 480, 0.1, 1000);
      camera.position.set(0, 0.3, 5);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // ── WebGL Renderer — transparent background ──
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setClearColor(0x000000, 0); // fully transparent
      renderer.setSize(380, 480);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.domElement.style.background = "transparent";
      canvasRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // ── CSS2D Renderer ──
      const labelRenderer = new CSS2DRenderer();
      labelRenderer.setSize(380, 480);
      labelRenderer.domElement.style.position = "absolute";
      labelRenderer.domElement.style.top = "0";
      labelRenderer.domElement.style.left = "0";
      labelRenderer.domElement.style.pointerEvents = "none";
      labelRenderer.domElement.style.overflow = "hidden";
      canvasRef.current.appendChild(labelRenderer.domElement);
      labelRendererRef.current = labelRenderer;

      // ── Lighting ──
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(3, 4, 2);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
      scene.add(dirLight);

      const bloodLight = new THREE.PointLight(BLOOD, 0.6, 10);
      bloodLight.position.set(-3, 0, 2);
      scene.add(bloodLight);

      // Interior vault light (starts dim)
      const interiorLight = new THREE.PointLight(GOLD, 0, 8);
      interiorLight.position.set(0, 0, -0.5);
      scene.add(interiorLight);
      interiorLightRef.current = interiorLight;

      // ── Door group (contains vault model + procedural parts) ──
      const doorGroup = new THREE.Group();
      doorGroupRef.current = doorGroup;

      const vaultGroup = new THREE.Group();
      vaultGroup.add(doorGroup);
      scene.add(vaultGroup);
      vaultGroupRef.current = vaultGroup;

      // ── Load safe model ──
      let modelLoaded = false;

      try {
        // Skip MTLLoader entirely — the OBJ references a wrong .mtl filename internally.
        // Instead, load OBJ without materials and apply our own texture + material.
        const textureLoader = new THREE.TextureLoader();
        const diffuseTexture = await new Promise<any>((resolve, reject) => {
          textureLoader.load(
            "/models/safe_diffuse.jpg",
            resolve,
            undefined,
            (err: any) => {
              console.error("VaultNav: Failed to load safe_diffuse.jpg", err);
              reject(err);
            }
          );
        });
        diffuseTexture.colorSpace = THREE.SRGBColorSpace;
        disposablesRef.current.push(diffuseTexture);

        const objLoader = new OBJLoader();

        const obj = await new Promise<any>((resolve, reject) => {
          objLoader.load(
            "/models/safe.obj",
            (loaded: any) => {
              console.log("VaultNav: safe.obj loaded, children:", loaded.children.length);
              resolve(loaded);
            },
            (progress: any) => {
              // progress callback
            },
            (err: any) => {
              console.error("VaultNav: Failed to load safe.obj", err);
              reject(err);
            }
          );
        });

        if (cancelled) return;

        // Count meshes
        let meshCount = 0;
        obj.traverse((child: any) => {
          if (child.isMesh) meshCount++;
        });
        console.log("VaultNav: Total mesh count in safe.obj:", meshCount);

        if (meshCount === 0) {
          throw new Error("OBJ parsed but contains zero meshes");
        }

        // Apply material + texture to ALL child meshes
        const safeMat = new THREE.MeshStandardMaterial({
          map: diffuseTexture,
          metalness: 0.4,
          roughness: 0.6,
          color: 0xbbbbbb,
        });
        disposablesRef.current.push(safeMat);

        obj.traverse((child: any) => {
          if (child.isMesh) {
            child.material = safeMat;
            child.visible = true;
            child.castShadow = true;
            child.receiveShadow = true;
            disposablesRef.current.push(child.geometry);
          }
        });

        // Scale the GROUP, compute bounding box on the group
        obj.scale.set(0.02, 0.02, 0.02);

        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        console.log("VaultNav: Bounding box size:", size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
        console.log("VaultNav: Bounding box center:", center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));

        obj.position.sub(center);

        doorGroup.add(obj);
        modelLoaded = true;
      } catch (err) {
        console.error("VaultNav: Model loading failed, using procedural fallback.", err);
      }

      // Fallback: procedural vault box if model didn't load
      if (!modelLoaded) {
        const fbGroup = new THREE.Group();

        // Main body
        const bodyGeo = new THREE.BoxGeometry(1.8, 1.8, 1.4);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x3a3a3a,
          metalness: 0.7,
          roughness: 0.3,
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        fbGroup.add(bodyMesh);
        disposablesRef.current.push(bodyGeo, bodyMat);

        // Door face (slightly raised)
        const doorFaceGeo = new THREE.BoxGeometry(1.7, 1.7, 0.05);
        const doorFaceMat = new THREE.MeshStandardMaterial({
          color: 0x4a4a4a,
          metalness: 0.8,
          roughness: 0.2,
        });
        const doorFace = new THREE.Mesh(doorFaceGeo, doorFaceMat);
        doorFace.position.z = 0.73;
        fbGroup.add(doorFace);
        disposablesRef.current.push(doorFaceGeo, doorFaceMat);

        // Hinge strips
        for (let i = -1; i <= 1; i++) {
          const hingeGeo = new THREE.BoxGeometry(0.08, 0.3, 0.06);
          const hingeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.1 });
          const hinge = new THREE.Mesh(hingeGeo, hingeMat);
          hinge.position.set(-0.88, i * 0.5, 0.75);
          fbGroup.add(hinge);
          disposablesRef.current.push(hingeGeo, hingeMat);
        }

        doorGroup.add(fbGroup);
      }

      // ── Procedural Dial ──
      const dialGroup = new THREE.Group();

      const dialTorusGeo = new THREE.TorusGeometry(0.35, 0.04, 16, 48);
      const dialTorusMat = new THREE.MeshStandardMaterial({
        color: BONE,
        metalness: 0.8,
        roughness: 0.2,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
      });
      const dialTorus = new THREE.Mesh(dialTorusGeo, dialTorusMat);
      dialGroup.add(dialTorus);
      disposablesRef.current.push(dialTorusGeo, dialTorusMat);

      const dialDiscGeo = new THREE.CircleGeometry(0.32, 48);
      const dialDiscMat = new THREE.MeshStandardMaterial({
        color: INK,
        metalness: 0.5,
        roughness: 0.4,
      });
      const dialDisc = new THREE.Mesh(dialDiscGeo, dialDiscMat);
      dialDisc.position.z = 0.001;
      dialGroup.add(dialDisc);
      disposablesRef.current.push(dialDiscGeo, dialDiscMat);

      // Dial tick marks
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const tickGeo = new THREE.BoxGeometry(0.02, 0.06, 0.01);
        const tickMat = new THREE.MeshStandardMaterial({ color: BONE });
        const tick = new THREE.Mesh(tickGeo, tickMat);
        tick.position.set(Math.cos(angle) * 0.26, Math.sin(angle) * 0.26, 0.005);
        tick.rotation.z = angle;
        dialGroup.add(tick);
        disposablesRef.current.push(tickGeo, tickMat);
      }

      // Dial needle
      const needleGeo = new THREE.BoxGeometry(0.015, 0.2, 0.01);
      const needleMat = new THREE.MeshStandardMaterial({
        color: BLOOD,
        emissive: new THREE.Color(BLOOD),
        emissiveIntensity: 0.3,
      });
      const needle = new THREE.Mesh(needleGeo, needleMat);
      needle.position.set(0, 0.1, 0.01);
      dialGroup.add(needle);
      disposablesRef.current.push(needleGeo, needleMat);

      dialGroup.position.set(0, 0.05, 1.05);
      doorGroup.add(dialGroup);
      dialRef.current = dialGroup;

      // ── Procedural Handle ──
      const handleGroup = new THREE.Group();
      const handleBarGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 16);
      const handleBarMat = new THREE.MeshStandardMaterial({
        color: BONE,
        metalness: 0.9,
        roughness: 0.1,
      });
      const handleBar = new THREE.Mesh(handleBarGeo, handleBarMat);
      handleBar.rotation.z = Math.PI / 2;
      handleGroup.add(handleBar);
      disposablesRef.current.push(handleBarGeo, handleBarMat);

      const knobGeo = new THREE.SphereGeometry(0.05, 16, 16);
      const knobMat = new THREE.MeshStandardMaterial({
        color: BONE,
        metalness: 0.9,
        roughness: 0.1,
      });
      const knobL = new THREE.Mesh(knobGeo, knobMat);
      knobL.position.set(-0.25, 0, 0);
      handleGroup.add(knobL);
      const knobR = new THREE.Mesh(knobGeo, knobMat);
      knobR.position.set(0.25, 0, 0);
      handleGroup.add(knobR);
      disposablesRef.current.push(knobGeo, knobMat);

      handleGroup.position.set(0, 0.6, 1.08);
      doorGroup.add(handleGroup);
      handleRef.current = handleGroup;

      // ── Gold Bars (hidden initially) ──
      const bars: any[] = [];
      const labelObjs: any[] = [];

      NAV_LABELS.forEach((label, i) => {
        const barGeo = new THREE.BoxGeometry(1.2, 0.15, 0.3);
        const barMat = new THREE.MeshStandardMaterial({
          color: GOLD,
          metalness: 0.9,
          roughness: 0.1,
          transparent: true,
          opacity: 0,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0,
        });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(0, 0.55 - i * 0.22, -0.5);
        bar.userData = { label, index: i, hovered: false };
        bar.castShadow = true;

        vaultGroup.add(bar);
        bars.push(bar);
        disposablesRef.current.push(barGeo, barMat);

        // CSS2D Label
        const labelDiv = document.createElement("div");
        labelDiv.className = styles.barLabel;
        labelDiv.textContent = label;
        labelDiv.style.opacity = "0";
        labelDiv.style.transition = "opacity 0.3s ease";
        labelDiv.style.pointerEvents = "auto";
        labelDiv.style.cursor = "pointer";

        labelDiv.addEventListener("mouseenter", () => {
          bar.userData.hovered = true;
          labelDiv.style.color = "#ffffff";
        });
        labelDiv.addEventListener("mouseleave", () => {
          bar.userData.hovered = false;
          labelDiv.style.color = "";
        });
        labelDiv.addEventListener("click", () => {
          // Pulse animation on bar
          gsap.to(bar.material, {
            emissiveIntensity: 1,
            duration: 0.15,
            yoyo: true,
            repeat: 1,
            onStart: () => {
              bar.material.emissive = new THREE.Color(GOLD);
            },
          });

          // Brief camera zoom
          gsap.to(camera.position, {
            z: 4.2,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
              gsap.to(camera.position, { z: 5, duration: 0.3 });
              navigateToPanel(label);
            },
          });
        });

        const labelObj = new CSS2DObject(labelDiv);
        labelObj.position.copy(bar.position);
        labelObj.position.z += 0.25;
        vaultGroup.add(labelObj);
        labelObjs.push(labelObj);
      });

      goldBarsRef.current = bars;
      labelObjectsRef.current = labelObjs;

      // ── Idle animations ──
      gsap.to(vaultGroup.rotation, {
        y: 0.05,
        yoyo: true,
        repeat: -1,
        duration: 3,
        ease: "sine.inOut",
      });

      gsap.to(dialGroup.rotation, {
        z: Math.PI * 2,
        repeat: -1,
        duration: 8,
        ease: "none",
      });

      // ── Mouse interaction for dial ──
      const canvas = renderer.domElement;
      let lastTickAngle = 0;

      const onMouseDown = (e: MouseEvent) => {
        if (stateRef.current === "locked" || stateRef.current === "unlocking") {
          isDraggingRef.current = true;
          lastMouseXRef.current = e.clientX;
          stateRef.current = "unlocking";
          lastTickAngle = dragAccumRef.current;

          // Kill auto-rotation
          gsap.killTweensOf(dialGroup.rotation);

          // Glow the dial red
          dialTorusMat.emissive = new THREE.Color(BLOOD);
          dialTorusMat.emissiveIntensity = 0.5;
          needleMat.emissiveIntensity = 0.8;

          setUnlockLabel("KEEP DRAGGING...");
        }
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = e.clientX - lastMouseXRef.current;
        lastMouseXRef.current = e.clientX;

        const rotDelta = delta * 0.02;
        dialGroup.rotation.z += rotDelta;
        dragAccumRef.current += Math.abs(rotDelta);

        // Tick sound every ~5 degrees (0.087 radians)
        if (dragAccumRef.current - lastTickAngle >= 0.087) {
          lastTickAngle = dragAccumRef.current;
          playTickSound();
        }

        // Increase glow as we approach unlock threshold
        const progress = Math.min(dragAccumRef.current / (Math.PI * 4), 1);
        dialTorusMat.emissiveIntensity = 0.5 + progress * 0.5;

        // Check if unlocked (720° = 4π radians)
        if (dragAccumRef.current >= Math.PI * 4) {
          isDraggingRef.current = false;
          triggerOpenSequence(THREE);
        }
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
      };

      canvas.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);

      // ── Raycasting for gold bar hover ──
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const onCanvasMouseMove = (e: MouseEvent) => {
        if (stateRef.current !== "open") return;
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(bars);

        bars.forEach((bar) => {
          const isHit = intersects.some((hit) => hit.object === bar);
          const targetZ = isHit ? -0.35 : -0.5;
          if (Math.abs(bar.position.z - targetZ) > 0.01) {
            gsap.to(bar.position, { z: targetZ, duration: 0.2 });
          }
        });
      };

      canvas.addEventListener("mousemove", onCanvasMouseMove);

      // ── Render loop ──
      const animate = () => {
        rafRef.current = requestAnimationFrame(animate);
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
      };
      animate();

      setIsLoading(false);

      // Store event cleanup
      return () => {
        canvas.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        canvas.removeEventListener("mousemove", onCanvasMouseMove);
      };
    };

    // ── Opening sequence ──
    function triggerOpenSequence(THREE: any) {
      if (stateRef.current === "opening" || stateRef.current === "open") return;
      stateRef.current = "opening";

      const dial = dialRef.current;
      const handle = handleRef.current;
      const door = doorGroupRef.current;
      const bars = goldBarsRef.current;
      const labels = labelObjectsRef.current;
      const intLight = interiorLightRef.current;

      // Kill idle sway
      if (vaultGroupRef.current) {
        gsap.killTweensOf(vaultGroupRef.current.rotation);
        gsap.to(vaultGroupRef.current.rotation, { y: 0, duration: 0.3 });
      }

      setUnlockLabel("");

      const tl = gsap.timeline({
        onComplete: () => { stateRef.current = "open"; },
      });

      // 0.0s: Dial snap + gold flash
      tl.to(dial.rotation, { z: 0, duration: 0.2, ease: "power2.out" }, 0);
      tl.to(dial.children[0]?.material || {}, {
        emissiveIntensity: 1.5,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        onStart: () => {
          const torusMat = dial.children[0]?.material;
          if (torusMat) torusMat.emissive = new THREE.Color(GOLD);
        },
      }, 0);

      // 0.4s: Handle rotates 90deg
      tl.to(handle.rotation, { z: -Math.PI / 2, duration: 0.6, ease: "power2.inOut" }, 0.4);

      // 0.9s: Door swings open -110deg on Y
      tl.to(door.rotation, { y: -110 * (Math.PI / 180), duration: 1.2, ease: "power2.inOut" }, 0.9);

      // Slight overshoot
      tl.to(door.rotation, { y: -105 * (Math.PI / 180), duration: 0.3, ease: "sine.out" }, 2.1);

      // 1.4s: Interior gold light
      tl.to(intLight, { intensity: 2.5, duration: 0.8, ease: "power2.out" }, 1.4);

      // 1.8s: Gold bars slide in with stagger
      bars.forEach((bar, i) => {
        tl.to(bar.material, { opacity: 1, duration: 0.3 }, 1.8 + i * 0.08);
        tl.fromTo(bar.position, { z: -1 }, { z: -0.5, duration: 0.4, ease: "back.out(1.2)" }, 1.8 + i * 0.08);
      });

      // 2.2s: Labels appear
      labels.forEach((obj, i) => {
        tl.add(() => {
          if (obj.element) obj.element.style.opacity = "1";
        }, 2.2 + i * 0.08);
      });
    }

    const cleanupPromise = initScene();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);

      // Kill all GSAP tweens
      if (vaultGroupRef.current) gsap.killTweensOf(vaultGroupRef.current.rotation);
      if (dialRef.current) gsap.killTweensOf(dialRef.current.rotation);
      if (handleRef.current) gsap.killTweensOf(handleRef.current.rotation);
      if (doorGroupRef.current) gsap.killTweensOf(doorGroupRef.current.rotation);
      goldBarsRef.current.forEach((bar) => {
        gsap.killTweensOf(bar.position);
        gsap.killTweensOf(bar.material);
      });
      if (cameraRef.current) gsap.killTweensOf(cameraRef.current.position);
      if (interiorLightRef.current) gsap.killTweensOf(interiorLightRef.current);

      // Dispose Three.js resources
      disposablesRef.current.forEach((d) => {
        if (d && typeof d.dispose === "function") d.dispose();
      });
      disposablesRef.current = [];

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.domElement?.remove();
      }
      if (labelRendererRef.current) {
        labelRendererRef.current.domElement?.remove();
      }

      cleanupPromise?.then((cleanup: any) => cleanup?.());

      sceneInitializedRef.current = false;
      stateRef.current = "locked";
      dragAccumRef.current = 0;
    };
  }, [isMobile, isVisible, navigateToPanel, playTickSound]);

  // ─── Render: nothing if not visible ──────────────────────────
  if (!isVisible) return null;

  // ─── Mobile fallback ──────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div
          className={`${styles.mobileFallback} ${!isVisible ? styles.hidden : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <div className={styles.mobileThread} />
          <div className={styles.mobileVaultBtn}>
            <div className={styles.mobileVaultDot} />
          </div>
        </div>

        <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.open : ""}`}>
          {NAV_LABELS.map((label) => (
            <button
              key={label}
              className={styles.mobileMenuItem}
              onClick={() => navigateToPanel(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </>
    );
  }

  // ─── Desktop: Spider vault trigger + expandable 3D vault ─────
  return (
    <>
      {/* A. Spider vault trigger — hangs from top-right */}
      <div className={styles.spiderContainer}>
        <div className={styles.webThread} />
        <div
          ref={spiderRef}
          className={styles.spiderVault}
          onClick={openVault}
        >
          <div className={styles.vaultMiniIcon}>
            <div className={styles.vaultMiniBody}>
              <div className={styles.vaultMiniDial} />
            </div>
          </div>
          <span className={styles.vaultLabel}>VAULT</span>
        </div>
      </div>

      {/* B. Dark blurred overlay */}
      <div
        ref={overlayRef}
        className={`${styles.overlay} ${isExpanded ? styles.active : ""}`}
        onClick={closeVault}
        style={{
          opacity: isExpanded ? 1 : 0,
          pointerEvents: isExpanded ? "auto" : "none",
          transition: "opacity 0.4s ease-in-out"
        }}
      />

      {/* C. Expanded vault canvas */}
      <div
        ref={expandedRef}
        className={`${styles.expandedVault} ${isExpanded ? styles.active : ""}`}
        style={{ 
          visibility: isExpanded ? "visible" : "hidden",
          opacity: isExpanded ? 1 : 0,
          pointerEvents: isExpanded ? "auto" : "none",
          transform: isExpanded ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0.3)",
          transition: "all 0.4s ease-in-out"
        }}
      >
        <div ref={canvasRef} className={styles.canvasWrapper}>
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <span className={styles.loadingText}>Loading vault</span>
            </div>
          )}
        </div>

        {!isLoading && stateRef.current !== "open" && isExpanded && (
          <div className={styles.unlockLabel}>
            {unlockLabel}
            <div style={{ fontSize: '8px', color: '#8a7e6e', marginTop: '8px', letterSpacing: '0.1em', fontWeight: 'bold' }}>PRESS ESC TO EXIT</div>
          </div>
        )}
      </div>

      {/* Blood flash overlay (hidden by default, animated on nav) */}
      <div ref={bloodFlashRef} className={styles.bloodFlash} />
    </>
  );
}
