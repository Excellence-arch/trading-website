'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Ticker } from '@trading/types';

interface CyberChart3DProps {
  ticker: Ticker | null;
  isActive: boolean;
}

export function CyberChart3D({ ticker, isActive }: CyberChart3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    prevPrice: ticker?.price || 0,
    priceDirection: 0, // +1 up, -1 down
    momentum: 0,
  });

  useEffect(() => {
    if (!ticker) return;
    if (stateRef.current.prevPrice !== 0 && ticker.price !== stateRef.current.prevPrice) {
      const dir = ticker.price > stateRef.current.prevPrice ? 1 : -1;
      stateRef.current.priceDirection = dir;
      stateRef.current.momentum = dir * 2.5;
    }
    stateRef.current.prevPrice = ticker.price;
  }, [ticker?.price]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !isActive) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0e14, 0.008);

    const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
    camera.position.set(0, 35, 120);
    camera.lookAt(0, 10, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 3. Holographic 3D Grid Plane (Cyber Depth Floor)
    const gridHelper = new THREE.GridHelper(260, 26, 0x1e3a8a, 0x0f172a);
    gridHelper.position.y = -15;
    scene.add(gridHelper);

    // 4. Glowing 3D Depth Wave Columns (Order Book Depth Simulation)
    const barCount = 28;
    const barsGroup = new THREE.Group();
    const barGeometry = new THREE.BoxGeometry(3.5, 1, 3.5);

    const greenMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    });
    const redMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    });

    const bars: THREE.Mesh[] = [];
    const baseHeights: number[] = [];

    for (let i = 0; i < barCount; i++) {
      const isBid = i < barCount / 2;
      const mat = isBid ? greenMaterial.clone() : redMaterial.clone();
      const bar = new THREE.Mesh(barGeometry, mat);

      const x = (i - barCount / 2) * 6;
      const z = -25 - Math.sin((i / barCount) * Math.PI) * 15;
      const h = Math.random() * 20 + 8;

      bar.position.set(x, -15 + h / 2, z);
      bar.scale.set(1, h, 1);
      bars.push(bar);
      baseHeights.push(h);
      barsGroup.add(bar);
    }
    scene.add(barsGroup);

    // 5. Floating Financial Particle Matrix (Sparks)
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const cUp = new THREE.Color(0x10b981);
    const cDown = new THREE.Color(0xef4444);
    const cCyan = new THREE.Color(0x06b6d4);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 220;
      positions[i * 3 + 1] = Math.random() * 60 - 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;

      velocities[i * 3] = (Math.random() - 0.5) * 0.1;
      velocities[i * 3 + 1] = Math.random() * 0.2 + 0.05;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

      const baseCol = Math.random() > 0.4 ? (Math.random() > 0.5 ? cUp : cDown) : cCyan;
      colors[i * 3] = baseCol.r;
      colors[i * 3 + 1] = baseCol.g;
      colors[i * 3 + 2] = baseCol.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 6. Interactive Mouse Parallax
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = nx * 0.15;
      targetRotX = ny * 0.08;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 7. Animation Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax
      camera.rotation.y += (targetRotY - camera.rotation.y) * 0.04;
      camera.rotation.x += (targetRotX - camera.rotation.x) * 0.04;

      // Pulse depth wave bars with market oscillation
      const mom = stateRef.current.momentum;
      stateRef.current.momentum *= 0.95; // decay momentum

      for (let i = 0; i < barCount; i++) {
        const bar = bars[i];
        const baseH = baseHeights[i];
        const wave = Math.sin(elapsedTime * 3 + i * 0.4) * 4;
        const currentH = Math.max(2, baseH + wave + (i < barCount / 2 ? mom * 3 : -mom * 3));

        bar.scale.y = currentH;
        bar.position.y = -15 + currentH / 2;
      }

      // Animate floating particles
      const posArr = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3 + 1] += velocities[i * 3 + 1] + (mom > 0 ? 0.2 : -0.1);

        if (posArr[i * 3 + 1] > 60) {
          posArr[i * 3 + 1] = -15;
          posArr[i * 3] = (Math.random() - 0.5) * 200;
        } else if (posArr[i * 3 + 1] < -15) {
          posArr[i * 3 + 1] = 60;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Subtle slow grid rotation
      gridHelper.rotation.y = Math.sin(elapsedTime * 0.15) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      barGeometry.dispose();
      greenMaterial.dispose();
      redMaterial.dispose();
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80 transition-opacity duration-700"
    />
  );
}
