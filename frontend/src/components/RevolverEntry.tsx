"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface RevolverEntryProps {
  onComplete: () => void;
  triggerShatter: () => void;
}

export default function RevolverEntry({ onComplete, triggerShatter }: RevolverEntryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  // Three.js refs
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const disposablesRef = useRef<any[]>([]);

  // Drag rotation refs
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const rotationVelRef = useRef({ x: 0, y: 0 });
  const idleRotatingRef = useRef(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    if (!canvasRef.current) return;

    let cancelled = false;

    const initScene = async () => {
      const THREE = await import("three");
      const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");

      if (cancelled || !canvasRef.current) return;

      // ── Scene ──
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const width = window.innerWidth;
      const height = window.innerHeight;

      // ── Camera ──
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 8);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // ── Renderer ──
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x0a0a08, 1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      canvasRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // ── Lighting ──
      const ambient = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(-3, 4, 3);
      keyLight.castShadow = true;
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0xc41e1e, 0.6, 20);
      rimLight.position.set(5, 0, -2);
      scene.add(rimLight);

      const fillLight = new THREE.PointLight(0xffffff, 0.15, 15);
      fillLight.position.set(0, -3, 3);
      scene.add(fillLight);

      // ── Load revolver model ──
      let modelLoadedSuccessfully = false;

      try {
        const objLoader = new OBJLoader();

        const obj = await new Promise<any>((resolve, reject) => {
          objLoader.load(
            "/models/revolver.obj",
            (loaded: any) => resolve(loaded),
            undefined,
            (err: any) => reject(err)
          );
        });

        if (cancelled) return;

        let meshCount = 0;
        obj.traverse((child: any) => {
          if (child.isMesh) meshCount++;
        });

        if (meshCount === 0) {
          throw new Error("OBJ loaded but contains zero meshes");
        }

        const revolverMat = new THREE.MeshStandardMaterial({
          color: 0xd4c9b0,
          metalness: 0.7,
          roughness: 0.3,
        });
        disposablesRef.current.push(revolverMat);

        obj.traverse((child: any) => {
          if (child.isMesh) {
            const name = child.name.toLowerCase();
            if (name.includes("shell") || name.includes("bullet") || name.includes("casing") || name.includes("fragment") || name.includes("patron") || name === "cylinder" || name.includes("baraban.001")) {
              child.visible = false;
              return;
            }
            child.material = revolverMat;
            child.visible = true;
            child.castShadow = true;
            child.receiveShadow = true;
            disposablesRef.current.push(child.geometry);
          }
        });

        // Auto-scale to roughly 4 units
        const initialBox = new THREE.Box3().setFromObject(obj);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
        const desiredSize = 4.0;
        const scale = desiredSize / maxDim;

        obj.scale.setScalar(scale);

        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center);

        // Initial orientation
        obj.rotation.y = Math.PI;

        scene.add(obj);
        modelRef.current = obj;
        modelLoadedSuccessfully = true;
      } catch {
        // Model loading failed, use fallback
      }

      // Fallback: cylinder geometry if model failed
      if (!modelLoadedSuccessfully) {
        const group = new THREE.Group();

        const cylGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 32);
        const cylMat = new THREE.MeshStandardMaterial({
          color: 0xd4c9b0,
          metalness: 0.7,
          roughness: 0.3,
        });
        const cylinder = new THREE.Mesh(cylGeo, cylMat);
        cylinder.rotation.x = Math.PI / 2;
        group.add(cylinder);
        disposablesRef.current.push(cylGeo, cylMat);

        // Chamber holes
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const holeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.32, 16);
          const holeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a08 });
          const hole = new THREE.Mesh(holeGeo, holeMat);
          hole.rotation.x = Math.PI / 2;
          hole.position.set(Math.cos(angle) * 0.45, Math.sin(angle) * 0.45, 0);
          group.add(hole);
          disposablesRef.current.push(holeGeo, holeMat);
        }

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 16);
        const barrelMat = new THREE.MeshStandardMaterial({
          color: 0xd4c9b0,
          metalness: 0.8,
          roughness: 0.2,
        });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(1.5, 0, 0);
        group.add(barrel);
        disposablesRef.current.push(barrelGeo, barrelMat);

        scene.add(group);
        modelRef.current = group;
      }

      setIsLoading(false);

      // ── Drag to rotate ──
      const onMouseDown = (e: MouseEvent) => {
        if (firedRef.current) return;
        isDraggingRef.current = true;
        idleRotatingRef.current = false;
        prevMouseRef.current = { x: e.clientX, y: e.clientY };
        rotationVelRef.current = { x: 0, y: 0 };
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current || firedRef.current || !modelRef.current) return;
        const dx = e.clientX - prevMouseRef.current.x;
        const dy = e.clientY - prevMouseRef.current.y;
        prevMouseRef.current = { x: e.clientX, y: e.clientY };

        modelRef.current.rotation.y += dx * 0.008;
        modelRef.current.rotation.x += dy * 0.008;

        rotationVelRef.current = { x: dy * 0.008, y: dx * 0.008 };
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
      };

      // Touch support
      const onTouchStart = (e: TouchEvent) => {
        if (firedRef.current) return;
        isDraggingRef.current = true;
        idleRotatingRef.current = false;
        const touch = e.touches[0];
        prevMouseRef.current = { x: touch.clientX, y: touch.clientY };
        rotationVelRef.current = { x: 0, y: 0 };
      };

      const onTouchMove = (e: TouchEvent) => {
        if (!isDraggingRef.current || firedRef.current || !modelRef.current) return;
        const touch = e.touches[0];
        const dx = touch.clientX - prevMouseRef.current.x;
        const dy = touch.clientY - prevMouseRef.current.y;
        prevMouseRef.current = { x: touch.clientX, y: touch.clientY };

        modelRef.current.rotation.y += dx * 0.008;
        modelRef.current.rotation.x += dy * 0.008;

        rotationVelRef.current = { x: dy * 0.008, y: dx * 0.008 };
      };

      const onTouchEnd = () => {
        isDraggingRef.current = false;
      };

      const el = renderer.domElement;
      el.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      el.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);

      // ── Render loop ──
      const animate = () => {
        rafRef.current = requestAnimationFrame(animate);

        if (modelRef.current && !firedRef.current) {
          // Idle rotation
          if (idleRotatingRef.current) {
            modelRef.current.rotation.y += 0.003;
          }

          // Inertia after drag
          if (!isDraggingRef.current && !idleRotatingRef.current) {
            modelRef.current.rotation.y += rotationVelRef.current.y;
            modelRef.current.rotation.x += rotationVelRef.current.x;
            rotationVelRef.current.x *= 0.96;
            rotationVelRef.current.y *= 0.96;

            // Return to idle when velocity is near zero
            if (
              Math.abs(rotationVelRef.current.x) < 0.0001 &&
              Math.abs(rotationVelRef.current.y) < 0.0001
            ) {
              idleRotatingRef.current = true;
            }
          }
        }

        renderer.render(scene, camera);
      };
      animate();

      // ── Handle resize ──
      const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      return () => {
        el.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        el.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
        window.removeEventListener("resize", onResize);
      };
    };

    const cleanupPromise = initScene();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);

      if (modelRef.current) gsap.killTweensOf(modelRef.current.rotation);
      if (cameraRef.current) gsap.killTweensOf(cameraRef.current.position);

      disposablesRef.current.forEach((d) => {
        if (d && typeof d.dispose === "function") d.dispose();
      });
      disposablesRef.current = [];

      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.domElement?.remove();
      }

      cleanupPromise?.then((cleanup: any) => cleanup?.());
    };
  }, [onComplete]);

  // ── Fire sequence ──
  const handleFire = () => {
    if (firedRef.current || !modelRef.current || isDraggingRef.current) return;
    firedRef.current = true;
    idleRotatingRef.current = false;

    const model = modelRef.current;
    const tl = gsap.timeline({ onComplete });

    // 1. Stop rotation and align barrel pointing right
    tl.to(model.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.6,
      ease: "power2.inOut",
    }, 0);

    // 2. Muzzle flash
    tl.to(".muzzle-flash", {
      opacity: 1,
      scale: 1.5,
      duration: 0.05,
      yoyo: true,
      repeat: 1,
    }, 0.7);

    // 3. Bullet travel
    tl.fromTo(".bullet",
      { x: 0, opacity: 1 },
      { x: "50vw", duration: 0.5, ease: "power2.in" },
      0.9
    );

    // 4. Trigger shatter
    tl.add(() => {
      gsap.set(".bullet", { opacity: 0 });
      triggerShatter();
    }, 1.4);

    // 5. Fade out entry container
    tl.to(containerRef.current, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.in",
    }, 3.5);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "#0a0a08",
        perspective: "1200px",
      }}
      onClick={handleFire}
    >
      {/* Three.js canvas container */}
      <div
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: "grab" }}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{
                borderColor: "#2a2820",
                borderTopColor: "#8a7e6e",
              }}
            />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                letterSpacing: "3px",
                color: "#8a7e6e",
                textTransform: "uppercase",
              }}
            >
              Loading armament
            </span>
          </div>
        </div>
      )}

      {/* Bottom text */}
      <div className="fixed bottom-[12vh] left-0 right-0 z-10 flex flex-col items-center pointer-events-none">
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.2em",
            color: "#8a7e6e",
            textTransform: "uppercase",
          }}
        >
          CLICK TO FIRE
        </span>
      </div>

      {/* Firing-sequence overlay elements */}
      <div className="fixed top-1/2 left-1/2 -translate-y-1/2 pointer-events-none z-30">
        <svg viewBox="0 0 100 100" className="muzzle-flash absolute w-32 h-32 opacity-0" style={{ left: "10vw", top: "-4rem" }}>
          <circle cx="50" cy="50" r="40" fill="#e8e0d0" filter="blur(10px)" />
          <path d="M50 0 L60 40 L100 50 L60 60 L50 100 L40 60 L0 50 L40 40 Z" fill="#fff" />
        </svg>
        <div
          className="bullet absolute h-[1px] opacity-0 w-10"
          style={{
            left: "12vw",
            backgroundColor: "#e8e0d0",
            boxShadow: "0 0 10px #e8e0d0",
          }}
        />
      </div>
    </div>
  );
}
