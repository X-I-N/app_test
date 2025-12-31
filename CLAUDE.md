# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based 3D interactive love visualization app using Three.js and React Three Fiber. The app creates an immersive 3D experience with particle animations, gesture controls via MediaPipe hand tracking, and romantic visual effects.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Tech Stack
- **Frontend Framework**: React 18 with Vite
- **3D Graphics**: Three.js + React Three Fiber (@react-three/fiber, @react-three/drei)
- **Styling**: Tailwind CSS with PostCSS
- **Gesture Recognition**: MediaPipe Hands (loaded via CDN)

### Core Components Structure

The application is a single-page 3D experience with the following main components in `app.jsx`:

1. **3D Visual Components**:
   - `SpiritParticles`: 24,000 particles forming two spirit entities that can merge into a heart shape
   - `BondThreads`: Connecting lines between the spirits that fade during merging
   - `VowRing`: Golden ring that appears when spirits are active
   - `Fireworks`: Particle explosion effect triggered by open hand gesture
   - `DigitRain`: Background year digits (2025/2026) falling like rain
   - `SnowyGround`: Ground particle plane

2. **Main Components**:
   - `Experience`: Orchestrates all 3D components with lighting and fog
   - `UI`: Overlay interface showing controls and romantic text
   - `App`: Root component handling MediaPipe integration and gesture state management

### Gesture Control System

The app uses MediaPipe for hand tracking with these gestures:
- **Closed fist + pull down**: Toggle power on/off
- **Pinch (thumb + index)**: Merge spirits into heart shape
- **Open hand**: Trigger fireworks
- **Hand position**: Rotate 3D scene

Gesture processing happens in the `onResults` callback with cooldowns to prevent spam.

### State Management

Key state variables in the root App component:
- `power`: Main on/off state affecting all visuals
- `pinchFactor`: 0-1 value controlling spirit merge animation
- `fireworkTrigger`: Boolean to trigger firework animation
- `rotation`: X/Y rotation based on hand position

### Performance Considerations

- Uses `useMemo` for static geometry generation
- Implements `useFrame` for smooth animations
- Point cloud rendering for efficient particle systems
- Additive blending for glowing effects
- LOD through opacity/size adjustments based on state

## Development Notes

- MediaPipe libraries load from CDN, requiring internet connection
- Camera permission required for hand tracking
- Debug canvas shows hand tracking overlay in top-right corner
- All animations run at 60 FPS target with 16ms latency monitoring