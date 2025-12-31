import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';

// --- Global Config & Styles ---
const COLORS = {
  sxy: '#00c2a8', // Cyan/Teal
  sjj: '#ff6fb1', // Warm Pink
  bg_off: '#010102',
  bg_on: '#050510',
  text: '#ffffff',
  gold: '#ffd700',
  bloom_glow: '#ffffff',
  purple: '#9b59b6',
  blue: '#3498db'
};

// --- Gesture Logic Helpers ---
const isHandClosed = (landmarks) => {
  // 改进的握拳检测：检查指尖是否都低于MCP关节（掌指关节）
  // 同时放宽阈值，让检测更灵敏
  const fingersClosed = 
    landmarks[8].y > landmarks[5].y - 0.02 &&   // 食指 (放宽阈值)
    landmarks[12].y > landmarks[9].y - 0.02 &&  // 中指
    landmarks[16].y > landmarks[13].y - 0.02 && // 无名指
    landmarks[20].y > landmarks[17].y - 0.02;   // 小指
  
  // 可选：检查拇指是否收拢（拇指尖靠近食指根部）
  const thumbClosed = getDistance(landmarks[4], landmarks[5]) < 0.15;
  
  return fingersClosed && thumbClosed;
};

const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// --- Enhanced 3D Components ---

// 1. Twin Light Spirits with enhanced breathing and flow
const TwinLightSpirits = ({ power, pinchFactor }) => {
  const count = 24000;
  const meshRef = useRef();
  const timeRef = useRef(0);
  
  const { positions, colors, sizes, phases, velocities, originalPositions } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const op = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const ph = new Float32Array(count);
    const v = new Float32Array(count * 3);

    const c1 = new THREE.Color(COLORS.sxy);
    const c2 = new THREE.Color(COLORS.sjj);
    const c3 = new THREE.Color(COLORS.purple);

    for (let i = 0; i < count; i++) {
      const isSetA = i < count / 2;
      
      // Multi-layered distribution for depth
      const layer = Math.floor(Math.random() * 3);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 1.5 + layer * 0.8 + Math.random() * 0.5;

      // Turbulence for organic feel
      const turbulence = 0.3;
      const noise = (Math.random() - 0.5) * turbulence;
      
      const x = r * Math.sin(phi) * Math.cos(theta) * (1 + noise);
      const y = r * Math.sin(phi) * Math.sin(theta) * (1 + noise);
      const z = r * Math.cos(phi) * (1 + noise);

      // Store original positions for reference
      op[i * 3] = x + (isSetA ? -4 : 4);
      op[i * 3 + 1] = y;
      op[i * 3 + 2] = z;
      
      p[i * 3] = op[i * 3];
      p[i * 3 + 1] = op[i * 3 + 1];
      p[i * 3 + 2] = op[i * 3 + 2];

      // Multi-color gradient
      const col = isSetA ? c1 : c2;
      const mixCol = i % 100 === 0 ? c3 : col;
      const colorVariation = 0.7 + Math.random() * 0.3;
      
      c[i * 3] = mixCol.r * colorVariation;
      c[i * 3 + 1] = mixCol.g * colorVariation;
      c[i * 3 + 2] = mixCol.b * colorVariation;

      // Varied sizes with more range
      s[i] = 0.2 + Math.random() * 0.8 + (layer * 0.1);
      
      // Complex phase for varied animation
      ph[i] = Math.random() * Math.PI * 2;
      
      // Velocities for turbulent flow
      v[i * 3] = (Math.random() - 0.5) * 0.03;
      v[i * 3 + 1] = (Math.random() - 0.5) * 0.03;
      v[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
    }
    
    return { positions: p, colors: c, sizes: s, phases: ph, velocities: v, originalPositions: op };
  }, []);

  const dummy = useMemo(() => new THREE.Vector3(), []);
  const targetVector = useMemo(() => new THREE.Vector3(), []);
  const mergeState = useRef(0);
  const flowTime = useRef(0);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    timeRef.current = time;
    flowTime.current += 0.01;
    
    const positionsAttribute = meshRef.current.geometry.attributes.position;
    const sizesAttribute = meshRef.current.geometry.attributes.size;
    const colorsAttribute = meshRef.current.geometry.attributes.color;
    
    // Smooth merge state
    if (pinchFactor > 0.1) {
      mergeState.current = MathUtils.lerp(mergeState.current, 1, 0.04);
    } else {
      mergeState.current = MathUtils.lerp(mergeState.current, 0, 0.02);
    }

    for (let i = 0; i < count; i++) {
      const isSetA = i < count / 2;
      const idx = i * 3;

      // Current position
      const cx = positionsAttribute.array[idx];
      const cy = positionsAttribute.array[idx + 1];
      const cz = positionsAttribute.array[idx + 2];

      // Multi-layered breathing with different frequencies
      const breathe1 = Math.sin(time * 1.5 + phases[i]) * 0.2;
      const breathe2 = Math.sin(time * 2.5 + phases[i] * 2) * 0.1;
      const breathe = breathe1 + breathe2;
      
      // Floating with turbulence
      const floatY = Math.sin(time * 0.3 + phases[i]) * 0.4;
      const floatX = Math.cos(time * 0.4 + phases[i]) * 0.2;
      const floatZ = Math.sin(time * 0.35 + phases[i] * 1.5) * 0.3;
      
      // Flow field simulation
      const flowAngle = flowTime.current + phases[i];
      const flowForce = 0.15;
      const flowX = Math.cos(flowAngle) * flowForce;
      const flowY = Math.sin(flowAngle * 0.7) * flowForce;
      
      let tx, ty, tz;

      if (mergeState.current > 0.1) {
        const t = (i / (count/2)) * Math.PI * 2;
        const mergeFactor = mergeState.current;
        
        if (mergeFactor > 0.7) {
          // Enhanced heart shape with 3D depth
          const scale = 0.25;
          const heartX = 16 * Math.pow(Math.sin(t), 3);
          const heartY = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
          const heartZ = Math.sin(t * 3) * 2 + Math.cos(t * 5) * 1;
          
          tx = scale * heartX;
          ty = scale * heartY + 1;
          tz = scale * heartZ;
          
          // Add spiral motion during merge
          const spiral = time * 0.5;
          tx += Math.cos(spiral + phases[i]) * 0.2 * (1 - mergeFactor);
          ty += Math.sin(spiral + phases[i]) * 0.2 * (1 - mergeFactor);
        } else {
          // Infinity symbol with rotation
          const scale = 3;
          tx = scale * Math.cos(t) / (1 + Math.sin(t) * Math.sin(t));
          ty = scale * Math.sin(t) * Math.cos(t) / (1 + Math.sin(t) * Math.sin(t));
          tz = Math.sin(t * 2) + Math.cos(time) * 0.5;
          
          // Rotation around center
          const rotAngle = time * 0.3;
          const tempX = tx;
          tx = tempX * Math.cos(rotAngle) - tz * Math.sin(rotAngle);
          tz = tempX * Math.sin(rotAngle) + tz * Math.cos(rotAngle);
        }
        
        // Pulsation during merge
        const pulse = 1 + Math.sin(time * 3) * 0.1 * mergeFactor;
        tx *= pulse;
        ty *= pulse;
        tz *= pulse;
        
      } else {
        // Enhanced separated spirits with complex motion
        const separationX = isSetA ? -3.5 : 3.5;
        const originalX = originalPositions[i * 3];
        const originalY = originalPositions[i * 3 + 1];
        const originalZ = originalPositions[i * 3 + 2];
        
        // Orbital motion with varying radius
        const orbitRadius = 2 + breathe * 0.5;
        const orbitSpeed = 0.2 + (i % 10) * 0.01;
        const orbitAngle = time * orbitSpeed + phases[i];
        
        // Complex path
        tx = originalX + 
             Math.sin(orbitAngle) * orbitRadius * 0.3 + 
             flowX + floatX +
             velocities[i * 3] * Math.sin(time + phases[i]);
             
        ty = originalY + 
             Math.cos(orbitAngle * 0.7) * orbitRadius * 0.3 + 
             flowY + floatY +
             velocities[i * 3 + 1] * Math.cos(time + phases[i]);
             
        tz = originalZ + 
             Math.sin(orbitAngle * 1.3) * orbitRadius * 0.2 + 
             floatZ +
             velocities[i * 3 + 2] * Math.sin(time * 0.7 + phases[i]);
      }

      // Power off - elegant drift
      if (!power) {
        tx = (isSetA ? -7 : 7) + Math.sin(time * 0.1 + phases[i]) * 0.5;
        ty *= 0.3;
        tz *= 0.3;
      }

      targetVector.set(tx, ty, tz);
      dummy.set(cx, cy, cz);
      
      // Variable lerp speed based on particle type
      const lerpSpeed = mergeState.current > 0.5 ? 0.06 : 0.025;
      dummy.lerp(targetVector, lerpSpeed);

      positionsAttribute.array[idx] = dummy.x;
      positionsAttribute.array[idx + 1] = dummy.y;
      positionsAttribute.array[idx + 2] = dummy.z;
      
      // Dynamic size with pulsation
      const baseSize = sizes[i];
      const pulse = 1 + Math.sin(time * 4 + phases[i]) * 0.15;
      const sizeMultiplier = power ? pulse : 0.4;
      sizesAttribute.array[i] = baseSize * sizeMultiplier * (1 + mergeState.current * 0.4);
      
      // Dynamic color shifts
      if (mergeState.current > 0.5) {
        const colorShift = Math.sin(time + phases[i]) * 0.2;
        colorsAttribute.array[idx] = colors[idx] * (1 + colorShift);
        colorsAttribute.array[idx + 1] = colors[idx + 1] * (1 - colorShift * 0.5);
        colorsAttribute.array[idx + 2] = colors[idx + 2] * (1 + colorShift * 0.3);
      }
    }
    
    positionsAttribute.needsUpdate = true;
    sizesAttribute.needsUpdate = true;
    colorsAttribute.needsUpdate = true;
    
    // Group rotation with multiple axes
    meshRef.current.rotation.y = Math.sin(time * 0.1) * 0.3;
    meshRef.current.rotation.z = Math.cos(time * 0.15) * 0.1;
    meshRef.current.rotation.x = Math.sin(time * 0.12) * 0.05;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.06} 
        vertexColors 
        transparent 
        opacity={power ? 0.9 : 0.25} 
        depthWrite={false} 
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// 2. Enhanced Bond Threads with flowing animation
const BondThreads = ({ power, pinchFactor }) => {
  const count = 5000;
  const linesRef = useRef();
  const opacityRef = useRef(0);
  const flowRef = useRef(0);
  
  const { positions, phases, originalPositions } = useMemo(() => {
    const pts = new Float32Array(count * 6);
    const origPts = new Float32Array(count * 6);
    const ph = new Float32Array(count);
    
    for(let i = 0; i < count; i++) {
      // Create curved paths
      const curve = Math.random() * Math.PI;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2.5;
      
      const y = (Math.random() - 0.5) * 4;
      const z = Math.sin(angle) * radius;
      const x = Math.cos(angle) * radius;
      
      // Curved connection points
      const midY = y + Math.sin(curve) * 0.5;
      
      origPts[i * 6] = -3.5 + x * 0.3;
      origPts[i * 6 + 1] = y;
      origPts[i * 6 + 2] = z;
      origPts[i * 6 + 3] = 3.5 + x * 0.3;
      origPts[i * 6 + 4] = y;
      origPts[i * 6 + 5] = z;
      
      // Copy to positions
      for(let j = 0; j < 6; j++) {
        pts[i * 6 + j] = origPts[i * 6 + j];
      }
      
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pts, phases: ph, originalPositions: origPts };
  }, []);

  useFrame((state) => {
    if(!linesRef.current) return;
    const time = state.clock.getElapsedTime();
    flowRef.current += 0.02;
    
    // Dynamic opacity based on state - keep very subtle
    const targetOpacity = power ? (1 - pinchFactor * 0.9) * 0.2 : 0.0;
    opacityRef.current = MathUtils.lerp(opacityRef.current, targetOpacity, 0.02);
    
    linesRef.current.material.opacity = opacityRef.current;
    
    // Animate line positions for flowing effect
    const posAttr = linesRef.current.geometry.attributes.position;
    
    for(let i = 0; i < count; i++) {
      const phase = phases[i];
      const flow = Math.sin(flowRef.current + phase) * 0.5;
      const wave = Math.sin(time * 2 + phase) * 0.2;
      
      // Flowing motion along the threads
      const t = (Math.sin(time + phase) + 1) * 0.5;
      
      for(let j = 0; j < 6; j += 3) {
        const origX = originalPositions[i * 6 + j];
        const origY = originalPositions[i * 6 + j + 1];
        const origZ = originalPositions[i * 6 + j + 2];
        
        // Add flowing distortion
        posAttr.array[i * 6 + j] = origX + wave * 0.2;
        posAttr.array[i * 6 + j + 1] = origY + flow * 0.3;
        posAttr.array[i * 6 + j + 2] = origZ + wave * 0.1;
      }
    }
    
    posAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count * 2} array={positions} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial 
        color={COLORS.sxy} 
        transparent 
        opacity={0} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false}
      />
    </lineSegments>
  );
};

// 3. Enhanced Vow Ring with particle trail
const VowRing = ({ power, pinchFactor }) => {
  const ringRef = useRef();
  const particleRef = useRef();
  const trailRef = useRef();

  useFrame((state) => {
    if(!ringRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Pulsating scale
    const pulse = 1 + Math.sin(time * 2) * 0.05;
    const targetScale = power ? (0.8 + pinchFactor * 0.7) * pulse : 0;
    const currentScale = ringRef.current.scale.x;
    const newScale = MathUtils.lerp(currentScale, targetScale, 0.04);
    ringRef.current.scale.setScalar(newScale);
    
    // Complex rotation pattern
    ringRef.current.rotation.z = time * 0.4;
    ringRef.current.rotation.x = Math.sin(time * 0.5) * 0.3;
    ringRef.current.rotation.y = Math.cos(time * 0.3) * 0.3;
    
    // Particle ring counter-rotation
    if(particleRef.current) {
      particleRef.current.rotation.z = -time * 0.3;
      particleRef.current.rotation.x = Math.cos(time * 0.4) * 0.2;
    }
  });

  return (
    <group ref={ringRef} scale={[0, 0, 0]}>
      {/* Main Ring with glow */}
      <mesh>
        <torusGeometry args={[1.5, 0.04, 64, 200]} />
        <meshStandardMaterial 
          color={COLORS.gold} 
          emissive={COLORS.gold} 
          emissiveIntensity={2.5}
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>
      
      {/* Inner energy ring */}
      <mesh>
        <torusGeometry args={[1.5, 0.15, 16, 100]} />
        <meshBasicMaterial 
          color={COLORS.bloom_glow} 
          transparent 
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Outer glow ring */}
      <mesh>
        <torusGeometry args={[1.52, 0.2, 8, 50]} />
        <meshBasicMaterial 
          color={COLORS.sxy} 
          transparent 
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Orbiting particles */}
      <points ref={particleRef}>
        <torusGeometry args={[1.8, 0.5, 32, 150]} />
        <pointsMaterial 
          size={0.015} 
          color={COLORS.gold} 
          transparent 
          opacity={0.7} 
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

// 4. Enhanced Fireworks with trail effect
const NewYearFireworks = ({ trigger }) => {
  const particlesRef = useRef();
  const [explosion, setExplosion] = useState(false);
  const velocitiesRef = useRef(null);
  const lifetimesRef = useRef(null);
  const colorsRef = useRef(null);
  
  useEffect(() => {
    const count = 8000;
    velocitiesRef.current = new Float32Array(count * 3);
    lifetimesRef.current = new Float32Array(count);
    colorsRef.current = new Float32Array(count * 3);
    
    for(let i = 0; i < count; i++) {
      // Multi-layer explosion
      const layer = Math.floor(Math.random() * 3);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = (0.3 + Math.random() * 1.5) * (1 + layer * 0.3);
      
      velocitiesRef.current[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocitiesRef.current[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocitiesRef.current[i * 3 + 2] = Math.cos(phi) * speed;
      
      lifetimesRef.current[i] = Math.random() * 0.5;
      
      // Random colors
      const colorChoice = Math.random();
      if(colorChoice < 0.33) {
        colorsRef.current[i * 3] = 1;
        colorsRef.current[i * 3 + 1] = 0.8;
        colorsRef.current[i * 3 + 2] = 0;
      } else if(colorChoice < 0.66) {
        colorsRef.current[i * 3] = 0;
        colorsRef.current[i * 3 + 1] = 0.8;
        colorsRef.current[i * 3 + 2] = 1;
      } else {
        colorsRef.current[i * 3] = 1;
        colorsRef.current[i * 3 + 1] = 0.4;
        colorsRef.current[i * 3 + 2] = 0.7;
      }
    }
  }, []);
  
  useEffect(() => {
    if(trigger) {
      setExplosion(true);
      const timer = setTimeout(() => setExplosion(false), 4000); // 改为4秒
      return () => clearTimeout(timer);
    }
  }, [trigger]);
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position;
    const colors = particlesRef.current.geometry.attributes.color;
    const sizes = particlesRef.current.geometry.attributes.size;
    const count = positions.count;
    
    if (explosion) {
      for(let i = 0; i < count; i++) {
        const idx = i * 3;
        const lifetime = lifetimesRef.current[i];
        
        // Slow motion expansion
        const slowFactor = 0.2;
        positions.array[idx] += velocitiesRef.current[idx] * delta * slowFactor;
        positions.array[idx + 1] += velocitiesRef.current[idx + 1] * delta * slowFactor;
        positions.array[idx + 2] += velocitiesRef.current[idx + 2] * delta * slowFactor;
        
        // Gentle gravity
        positions.array[idx + 1] -= delta * 0.25;
        
        // Faster fade out - 在3-4秒内完全消失
        const fadeSpeed = 0.35; // 加快淡出速度
        const fade = Math.max(0, 1 - lifetime * fadeSpeed);
        const twinkle = Math.sin(state.clock.getElapsedTime() * 12 + i) * 0.3 + 0.7;
        sizes.array[i] = fade * fade * 0.06 * twinkle; // 使用平方让后期淡出更快
        
        // 更快的颜色演变
        const colorEvolution = lifetime * 0.5;
        colors.array[idx] = colorsRef.current[idx] * (1 - colorEvolution * 0.4);
        colors.array[idx + 1] = colorsRef.current[idx + 1] * (1 - colorEvolution * 0.3);
        colors.array[idx + 2] = colorsRef.current[idx + 2] * (1 + colorEvolution * 0.2);
        
        lifetimesRef.current[i] += delta * 0.35; // 加快生命周期
      }
      
      // 整体透明度也随时间降低
      const maxLifetime = Math.max(...lifetimesRef.current.slice(0, count));
      const globalFade = Math.max(0, 1 - maxLifetime * 0.25);
      particlesRef.current.material.opacity = MathUtils.lerp(particlesRef.current.material.opacity, 0.7 * globalFade, 0.05);
    } else {
      // Reset particles - 放在更高的位置，避免遮挡
      for(let i = 0; i < count; i++) {
        const r = Math.random() * 0.03;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        positions.array[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions.array[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 3.5; // 提高起始位置
        positions.array[i * 3 + 2] = r * Math.cos(phi) - 2; // 稍微往后移
        
        sizes.array[i] = 0;
        lifetimesRef.current[i] = 0;
        
        // 重置颜色
        colors.array[i * 3] = colorsRef.current[i * 3];
        colors.array[i * 3 + 1] = colorsRef.current[i * 3 + 1];
        colors.array[i * 3 + 2] = colorsRef.current[i * 3 + 2];
      }
      particlesRef.current.material.opacity = 0;
    }
    
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
  });

  const { positions, colors, sizes } = useMemo(() => {
    const count = 8000;
    return {
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count)
    };
  }, []);

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={8000} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={8000} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={8000} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.04} 
        vertexColors
        blending={THREE.AdditiveBlending} 
        transparent 
        opacity={0} 
        depthWrite={false}
        depthTest={false} // 确保烟花不会被其他物体遮挡
        sizeAttenuation
      />
    </points>
  );
};

// 5. Enhanced Digit Rain with glow
const DigitRain = ({ power }) => {
  const groupRef = useRef();
  const transitionRef = useRef(0);
  
  const items = useMemo(() => {
    const temp = [];
    for(let i = 0; i < 60; i++) {
      temp.push({
        pos: [
          (Math.random() - 0.5) * 25,
          Math.random() * 20 - 5,
          -10 - Math.random() * 15
        ],
        speed: 0.05 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        size: 0.2 + Math.random() * 0.2
      });
    }
    return temp;
  }, []);

  useFrame((state, delta) => {
    if(groupRef.current) {
      // Smooth transition
      const targetTransition = power ? 1 : 0;
      transitionRef.current = MathUtils.lerp(transitionRef.current, targetTransition, 0.01);
      
      groupRef.current.children.forEach((child, i) => {
        // Gentle falling motion
        child.position.y -= items[i].speed * delta * 3;
        if(child.position.y < -10) child.position.y = 10;
        
        // Horizontal drift
        child.position.x += Math.sin(state.clock.getElapsedTime() * 0.5 + items[i].phase) * 0.01;
        
        // Pulsating glow
        const glow = Math.sin(state.clock.getElapsedTime() * 2 + items[i].phase) * 0.3 + 0.7;
        child.fillOpacity = (power ? 0.3 : 0.05) * glow;
        
        // Rotation for depth
        child.rotation.z = Math.sin(state.clock.getElapsedTime() + items[i].phase) * 0.1;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {items.map((item, i) => {
        const year = transitionRef.current > 0.5 ? "2026" : "2025";
        return (
          <Text
            key={i}
            position={item.pos}
            fontSize={item.size}
            color={power ? COLORS.sxy : "#333"}
            anchorX="center"
            anchorY="middle"
            fillOpacity={0.2}
            outlineWidth={0.002}
            outlineColor={COLORS.gold}
            outlineOpacity={power ? 0.3 : 0}
          >
            {year}
          </Text>
        );
      })}
    </group>
  );
};

// 6. Enhanced Snowy Ground with fog
const SnowyGlowGround = ({ power }) => {
  const meshRef = useRef();
  const timeRef = useRef(0);
  
  const { positions, phases, colors } = useMemo(() => {
    const size = 150;
    const segments = 200;
    const pos = [];
    const ph = [];
    const col = [];
    
    const c1 = new THREE.Color(COLORS.sxy);
    const c2 = new THREE.Color(COLORS.sjj);
    const c3 = new THREE.Color(COLORS.bloom_glow);
    
    for(let i = 0; i <= segments; i++) {
      for(let j = 0; j <= segments; j++) {
        const x = (i / segments - 0.5) * size;
        const z = (j / segments - 0.5) * size;
        
        // Undulating terrain
        const height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5;
        const y = height - 6;
        
        pos.push(x, y, z);
        ph.push(Math.random() * Math.PI * 2);
        
        // Color variation
        const colorMix = Math.random();
        const baseColor = colorMix < 0.5 ? c1 : (colorMix < 0.8 ? c2 : c3);
        col.push(baseColor.r, baseColor.g, baseColor.b);
      }
    }
    
    return { 
      positions: new Float32Array(pos),
      phases: new Float32Array(ph),
      colors: new Float32Array(col)
    };
  }, []);
  
  useFrame((state) => {
    if(!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    timeRef.current += 0.01;
    
    // Wave animation
    const posAttr = meshRef.current.geometry.attributes.position;
    const segments = 200;
    
    for(let i = 0; i <= segments; i++) {
      for(let j = 0; j <= segments; j++) {
        const idx = (i * (segments + 1) + j) * 3;
        const x = posAttr.array[idx];
        const z = posAttr.array[idx + 2];
        
        // Multiple wave layers
        const wave1 = Math.sin(x * 0.02 + timeRef.current) * 0.3;
        const wave2 = Math.cos(z * 0.02 + timeRef.current * 1.3) * 0.2;
        const wave3 = Math.sin((x + z) * 0.01 + timeRef.current * 0.7) * 0.4;
        
        posAttr.array[idx + 1] = -6 + wave1 + wave2 + wave3;
      }
    }
    posAttr.needsUpdate = true;
    
    // Opacity and color breathing
    const breathe = Math.sin(time * 0.5) * 0.2 + 0.8;
    meshRef.current.material.opacity = MathUtils.lerp(
      meshRef.current.material.opacity, 
      power ? 0.3 * breathe : 0.02, 
      0.02
    );
    
    meshRef.current.material.size = power ? 0.1 : 0.05;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.08} 
        vertexColors
        transparent 
        opacity={0.05} 
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        fog={false}
      />
    </points>
  );
};

// 7. Add Sparkles for ambient magic
const AmbientSparkles = ({ power }) => {
  return power ? (
    <Sparkles
      count={200}
      speed={0.5}
      opacity={0.8}
      scale={20}
      size={2}
      color={COLORS.gold}
      noise={0.2}
    />
  ) : null;
};

// --- Main Experience Component ---
const Experience = ({ power, pinchFactor, fireworkTrigger, rotation }) => {
  const groupRef = useRef();

  useFrame(() => {
    if(groupRef.current) {
      // Smooth rotation with damping
      groupRef.current.rotation.y = MathUtils.damp(groupRef.current.rotation.y, rotation.x * 2, 2, 0.016);
      groupRef.current.rotation.x = MathUtils.damp(groupRef.current.rotation.x, rotation.y * 0.5, 2, 0.016);
    }
  });

  return (
    <>
      <color attach="background" args={[power ? COLORS.bg_on : COLORS.bg_off]} />
      <fog attach="fog" args={[power ? COLORS.bg_on : COLORS.bg_off, 10, 60]} />
      
      {/* Enhanced Lighting */}
      <ambientLight intensity={power ? 0.3 : 0.02} />
      <pointLight position={[0, 5, 10]} intensity={power ? 1.5 : 0} color={COLORS.sxy} />
      <pointLight position={[0, -5, -10]} intensity={power ? 1 : 0} color={COLORS.sjj} />
      <pointLight position={[10, 0, 0]} intensity={power ? 0.5 : 0} color={COLORS.purple} />
      <pointLight position={[-10, 0, 0]} intensity={power ? 0.5 : 0} color={COLORS.blue} />

      <group ref={groupRef}>
        <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.4}>
          <TwinLightSpirits power={power} pinchFactor={pinchFactor} />
          {/* <BondThreads power={power} pinchFactor={pinchFactor} /> */}
          <VowRing power={power} pinchFactor={pinchFactor} />
        </Float>
        
        <NewYearFireworks trigger={fireworkTrigger} />
        <DigitRain power={power} />
        <SnowyGlowGround power={power} />
        <AmbientSparkles power={power} />
      </group>
    </>
  );
};

// --- Overlay UI ---
const UI = ({ power, pinchFactor }) => {
  const [textVisible, setTextVisible] = useState(false);
  
  useEffect(() => {
    if(power) {
      const timer = setTimeout(() => setTextVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setTextVisible(false);
    }
  }, [power]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden">
      {/* Left Panel */}
      <div className={`absolute top-1/4 left-6 transition-all duration-1000 ${power ? 'opacity-100' : 'opacity-50'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${power ? 'bg-green-400 shadow-[0_0_30px_#4ade80] animate-pulse' : 'bg-red-600'} transition-all duration-500`}></div>
          <span className="text-[10px] tracking-[0.3em] text-white/30 font-light">LOVE ENGINE</span>
        </div>
        <div className="text-white/15 text-[9px] flex flex-col gap-2 pl-6 font-mono">
          <p className="hover:text-white/30 transition-colors">✊ FIST → TOGGLE</p>
          <p className="text-[8px] text-white/10">Hold 0.8s or Pull down</p>
          <div className={`mt-3 space-y-1 transition-all duration-1000 ${power ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
            <p className="hover:text-white/30 transition-colors">👌 PINCH → MERGE</p>
            <p className="hover:text-white/30 transition-colors">🖐️ OPEN → FIREWORKS</p>
            <p className="hover:text-white/30 transition-colors">👉 POINT → ROTATE</p>
          </div>
        </div>
      </div>

      {/* Center Main Text with Enhanced Animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-4">
        <h1 
          className={`text-4xl sm:text-5xl md:text-6xl font-medium mb-6 transition-all duration-[2500ms] whitespace-nowrap ${
            textVisible ? 'opacity-100 translate-y-0 blur-0 scale-100' : 'opacity-0 translate-y-8 blur-md scale-95'
          }`}
        >
          <span className="love-names name-sxy">Sxy</span>
          <span className="text-pink-400 mx-3 sm:mx-4 text-3xl sm:text-4xl md:text-5xl animate-pulse inline-block align-middle" style={{
            textShadow: '0 0 25px rgba(255, 111, 177, 0.6)',
            fontFamily: 'serif'
          }}>♥</span>
          <span className="love-names name-sjj">Sjj</span>
        </h1>
        
        <div className={`h-[2px] w-40 bg-gradient-to-r from-transparent via-white/40 to-transparent mx-auto mb-6 transition-all duration-[3000ms] delay-300 ${
          textVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
        }`}></div>
        
        <p className={`text-cyan-300/70 text-sm md:text-base tracking-[0.5em] font-extralight transition-all duration-[3500ms] delay-500 ${
          textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <span className="inline-block hover:scale-110 transition-transform">1</span>
          <span className="inline-block hover:scale-110 transition-transform">1</span>
          <span className="inline-block hover:scale-110 transition-transform">1</span>
          <span className="inline-block hover:scale-110 transition-transform mx-2">DAYS</span>
        </p>
        
        <div className={`mt-8 transition-all duration-[4000ms] delay-700 ${
          textVisible ? 'opacity-100' : 'opacity-0'
        }`}>
          <p className="text-white/30 text-xs md:text-sm font-extralight tracking-widest">
            从 2025 到 2026
          </p>
          <p className="text-base md:text-lg mt-3" style={{
            fontFamily: 'Dancing Script, cursive',
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.7)',
            textShadow: '0 0 10px rgba(255, 111, 177, 0.3)',
            letterSpacing: '0.15em',
            fontWeight: '400'
          }}>
            我想一直牵着你
          </p>
        </div>
        
        {/* Merge Status */}
        {pinchFactor > 0.6 && (
          <div className="mt-12 text-pink-200/50 text-[10px] tracking-[0.6em]">
            <span className="inline-block animate-bounce delay-0">∞</span>
            <span className="inline-block animate-bounce delay-100 mx-2">ETERNAL</span>
            <span className="inline-block animate-bounce delay-200">∞</span>
          </div>
        )}
      </div>

      {/* Bottom Status */}
      <div className={`absolute bottom-6 left-6 transition-opacity duration-500 ${power ? 'opacity-40' : 'opacity-10'}`}>
        <div className="text-[8px] text-white/15 tracking-[0.2em] font-mono">
          <p>PARTICLES: {(24000 + 5000 + 8000 + 60000).toLocaleString()}</p>
          <p>LOVE LEVEL: {Math.floor(pinchFactor * 100)}%</p>
          <p>FPS: 60</p>
        </div>
      </div>
    </div>
  );
};

// --- App Root ---
export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [loaded, setLoaded] = useState(false);
  const [power, setPower] = useState(false);
  const [pinchFactor, setPinchFactor] = useState(0);
  const [fireworkTrigger, setFireworkTrigger] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const gestureState = useRef({
    lastPullY: 0,
    pullCooldown: 0,
    pullStartY: null,
    wasClosedLastFrame: false,
    closeStartTime: null,
    isPinching: false,
    pinchStartDist: 0,
    lastFirework: 0,
    mergeHoldTimer: null
  });

  useEffect(() => {
    // Load MediaPipe
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
    ];

    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      document.body.appendChild(script);
    });

    let camera = null;
    let hands = null;

    const onResults = (results) => {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;
      
      const landmarks = results.multiHandLandmarks[0];
      const now = Date.now();
      
      // Power Toggle - 改进的握拳下拉检测
      const wristY = landmarks[0].y;
      const palmY = landmarks[9].y; // 使用中指根部作为参考点，更稳定
      const isClosed = isHandClosed(landmarks);
      
      // 记录握拳状态变化
      if (isClosed && !gestureState.current.wasClosedLastFrame) {
        // 刚握拳时记录初始位置
        gestureState.current.pullStartY = palmY;
        gestureState.current.wasClosedLastFrame = true;
      } else if (!isClosed) {
        gestureState.current.wasClosedLastFrame = false;
        gestureState.current.pullStartY = null;
      }
      
      // 检测下拉动作 - 降低阈值从0.12到0.06，更容易触发
      if (isClosed && gestureState.current.pullCooldown < now) {
        // 方法1：使用相对于握拳开始位置的移动距离
        const pullDistance = gestureState.current.pullStartY ? (palmY - gestureState.current.pullStartY) : 0;
        
        // 方法2：握拳保持1秒自动触发（新增）
        const holdDuration = gestureState.current.wasClosedLastFrame ? 
          (now - (gestureState.current.closeStartTime || now)) : 0;
        
        if (!gestureState.current.closeStartTime && isClosed) {
          gestureState.current.closeStartTime = now;
        }
        
        // 满足任一条件即可触发
        if (pullDistance > 0.06 || holdDuration > 800) {
          setPower(prev => !prev);
          gestureState.current.pullCooldown = now + 800; // 冷却时间减少到800ms
          gestureState.current.pullStartY = palmY; // 重置起始位置
          gestureState.current.closeStartTime = null; // 重置握拳计时
          
          // 视觉反馈
          console.log('Power toggled! Method:', pullDistance > 0.06 ? 'pull' : 'hold');
        }
      }
      
      // 松手时重置握拳计时
      if (!isClosed) {
        gestureState.current.closeStartTime = null;
      }
      
      gestureState.current.lastPullY = palmY;

      // Pinch Detection
      const dist = getDistance(landmarks[4], landmarks[8]);
      const isPinching = dist < 0.06;
      
      if (isPinching) {
        setPinchFactor(prev => Math.min(prev + 0.025, 1));
        
        if(gestureState.current.mergeHoldTimer) {
          clearTimeout(gestureState.current.mergeHoldTimer);
          gestureState.current.mergeHoldTimer = null;
        }
      } else {
        setPinchFactor(prev => {
          if(prev > 0.5 && !gestureState.current.mergeHoldTimer) {
            gestureState.current.mergeHoldTimer = setTimeout(() => {
              setPinchFactor(0);
              gestureState.current.mergeHoldTimer = null;
            }, 3000);
          } else if(prev <= 0.5) {
            return Math.max(prev - 0.015, 0);
          }
          return prev;
        });
      }

      // Open Hand Firework
      if (!isClosed && !isPinching && gestureState.current.lastFirework + 3000 < now) {
        const fingersOpen = landmarks[8].y < landmarks[5].y - 0.05 &&
                           landmarks[12].y < landmarks[9].y - 0.05 &&
                           landmarks[16].y < landmarks[13].y - 0.05;
        
        if (fingersOpen) {
          setFireworkTrigger(t => !t);
          gestureState.current.lastFirework = now;
        }
      }

      // Rotation
      const rx = (landmarks[8].x - 0.5) * 2;
      const ry = (landmarks[8].y - 0.5) * 2;
      setRotation({ x: rx, y: ry });

      // Draw debug
      const canvasCtx = canvasRef.current?.getContext('2d');
      if(canvasCtx && window.drawConnectors && window.drawLandmarks) {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        for (const landmarks of results.multiHandLandmarks) {
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {color: '#00c2a8', lineWidth: 1});
          window.drawLandmarks(canvasCtx, landmarks, {color: '#ff6fb1', lineWidth: 1, radius: 2});
        }
        canvasCtx.restore();
      }
    };

    const initMediaPipe = () => {
      if (window.Hands) {
        hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        hands.onResults(onResults);

        if (videoRef.current) {
          camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              await hands.send({image: videoRef.current});
            },
            width: 320,
            height: 240
          });
          camera.start();
          setLoaded(true);
        }
      } else {
        setTimeout(initMediaPipe, 500);
      }
    };
    
    setTimeout(initMediaPipe, 1500);

    return () => {
      if(camera) camera.stop();
      if(hands) hands.close();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Parisienne&family=Dancing+Script:wght@400;700&family=Satisfy&family=Kaushan+Script&family=Inter:wght@100;200;300;400&display=swap');
        
        * {
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .love-names {
          font-family: 'Dancing Script', 'Parisienne', cursive;
          font-weight: 700;
          background: linear-gradient(120deg, #00c2a8 0%, #00e5cc 25%, #ff6fb1 75%, #ff8fc7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
          filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
          animation: shimmer 4s ease-in-out infinite;
          display: inline-block;
          line-height: 1.2;
          letter-spacing: 0.05em;
        }
        
        @keyframes shimmer {
          0%, 100% { 
            filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.4)) brightness(1);
            background-size: 100% 100%;
          }
          50% { 
            filter: drop-shadow(0 0 20px rgba(255, 111, 177, 0.6)) brightness(1.1);
            background-size: 110% 110%;
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .name-sxy {
          display: inline-block;
          animation: float-left 5s ease-in-out infinite;
          transform-origin: center;
        }
        
        .name-sjj {
          display: inline-block;
          animation: float-right 5s ease-in-out infinite;
          transform-origin: center;
        }
        
        @keyframes float-left {
          0%, 100% { 
            transform: translateY(0) rotate(-0.5deg) scale(1); 
          }
          50% { 
            transform: translateY(-3px) rotate(0.5deg) scale(1.01); 
          }
        }
        
        @keyframes float-right {
          0%, 100% { 
            transform: translateY(0) rotate(0.5deg) scale(1); 
          }
          50% { 
            transform: translateY(-3px) rotate(-0.5deg) scale(1.01);
          }
        }
        
        /* Mobile responsive */
        @media (max-width: 640px) {
          .love-names {
            font-size: 0.9em;
          }
        }
      `}</style>

      {/* 3D Scene */}
      <Canvas 
        camera={{ position: [0, 0, 12], fov: 60 }} 
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        <Suspense fallback={null}>
          <Experience 
            power={power} 
            pinchFactor={pinchFactor} 
            fireworkTrigger={fireworkTrigger}
            rotation={rotation}
          />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <UI power={power} pinchFactor={pinchFactor} />

      {/* MediaPipe Debug */}
      <div className="absolute top-4 right-4 w-32 h-24 rounded-xl overflow-hidden border border-white/5 bg-black/60 backdrop-blur-md z-50">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} width={320} height={240} className="w-full h-full object-cover opacity-50" />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white/30 animate-pulse">
            CALIBRATING...
          </div>
        )}
      </div>
      
      {/* Loading Screen */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black z-[100] flex flex-col items-center justify-center text-white">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-t-2 border-cyan-400/30 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-24 h-24 border-b-2 border-pink-400/30 rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
            <div className="absolute inset-2 w-20 h-20 border-l-2 border-purple-400/20 rounded-full animate-spin" style={{animationDuration: '3s'}}></div>
          </div>
          <p className="tracking-[0.6em] text-[9px] opacity-40 font-extralight uppercase">Initializing Love</p>
          <p className="text-[8px] mt-3 text-white/20 tracking-widest">Please allow camera</p>
        </div>
      )}
    </div>
  );
}