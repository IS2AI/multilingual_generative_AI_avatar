import {
    CameraControls,
    ContactShadows,
    Environment,
    Text,
    Plane,
    Box,
    useGLTF,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";
import * as THREE from "three";

// Soft background helper so we can tint the scene per environment
const SceneBackground = ({ color = "#f3f6fb" }) => (
    <color attach="background" args={[color]} />
);



const Dots = (props) => {
    const { loading } = useChat();
    const [loadingText, setLoadingText] = useState("");
    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setLoadingText((loadingText) => {
                    if (loadingText.length > 2) {
                        return ".";
                    }
                    return loadingText + ".";
                });
            }, 800);
            return () => clearInterval(interval);
        } else {
            setLoadingText("");
        }
    }, [loading]);
    if (!loading) return null;
    return (
        <group {...props}>
            <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
                {loadingText}
                <meshBasicMaterial attach="material" color="white" />
            </Text>
        </group>
    );
};

const Whiteboard = () => {
    return (
        <group position={[0, 1.6, -2.4]}>
            <Box args={[3.6, 2.3, 0.08]} position={[0, 0, -0.05]}>
                <meshStandardMaterial color="#111827" />
            </Box>
            <Plane args={[3.4, 2]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#1f2937" />
            </Plane>
            <Text
                position={[0, 0.55, 0.02]}
                fontSize={0.16}
                color="#d1fae5"
                anchorX="center"
                anchorY="middle"
            >
                Quantum Mechanics 101
            </Text>
            <Text
                position={[-1.35, 0.2, 0.02]}
                fontSize={0.1}
                color="#a5b4fc"
                anchorX="left"
                anchorY="middle"
            >
                • Wave-Particle Duality
            </Text>
            <Text
                position={[-1.35, -0.05, 0.02]}
                fontSize={0.1}
                color="#fbbf24"
                anchorX="left"
                anchorY="middle"
            >
                • Uncertainty Principle
            </Text>
            <Text
                position={[-1.35, -0.3, 0.02]}
                fontSize={0.1}
                color="#34d399"
                anchorX="left"
                anchorY="middle"
            >
                • Schrödinger Equation
            </Text>
        </group>
    );
};

const ClassroomDesks = () => {
    const deskPositions = [
        [-2.2, 0, 1.2], [0, 0, 1.2], [2.2, 0, 1.2],
        [-2.2, 0, 2.8], [0, 0, 2.8], [2.2, 0, 2.8],
    ];

    return (
        <group>
            {deskPositions.map((position, index) => (
                <group key={index} position={position}>
                    {/* Desk surface */}
                    <Box args={[1, 0.1, 0.6]} position={[0, 0.75, 0]}>
                        <meshStandardMaterial color="#d97706" />
                    </Box>
                    {/* Desk legs */}
                    <Box args={[0.05, 0.7, 0.05]} position={[-0.4, 0.35, -0.25]}>
                        <meshStandardMaterial color="#5b3b1a" />
                    </Box>
                    <Box args={[0.05, 0.7, 0.05]} position={[0.4, 0.35, -0.25]}>
                        <meshStandardMaterial color="#5b3b1a" />
                    </Box>
                    <Box args={[0.05, 0.7, 0.05]} position={[-0.4, 0.35, 0.25]}>
                        <meshStandardMaterial color="#5b3b1a" />
                    </Box>
                    <Box args={[0.05, 0.7, 0.05]} position={[0.4, 0.35, 0.25]}>
                        <meshStandardMaterial color="#5b3b1a" />
                    </Box>
                    {/* Chair */}
                    <Box args={[0.8, 0.1, 0.5]} position={[0, 0.4, 0.5]}>
                        <meshStandardMaterial color="#334155" />
                    </Box>
                    <Box args={[0.8, 0.8, 0.1]} position={[0, 0.8, 0.75]}>
                        <meshStandardMaterial color="#475569" />
                    </Box>
                </group>
            ))}
        </group>
    );
};

const ClassroomFloor = () => {
    return (
        <Plane args={[22, 22]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#f1ede6" />
        </Plane>
    );
};

const ClassroomWalls = () => {
    return (
        <group>
            {/* Back wall */}
            <Plane args={[20, 8]} position={[0, 4, -6]} rotation={[0, 0, 0]}>
                <meshStandardMaterial color="#e8ecf7" />
            </Plane>
            {/* Left wall */}
            <Plane args={[12, 8]} position={[-11, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
                <meshStandardMaterial color="#eef1f7" />
            </Plane>
            {/* Right wall */}
            <Plane args={[12, 8]} position={[11, 4, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <meshStandardMaterial color="#eef1f7" />
            </Plane>
        </group>
    );
};

const ClassroomDecor = () => {
    const windowY = 3;
    const windowZ = -5.99;
    const posters = [
        { pos: [-4, 2.8, -5.01], color: "#bfdbfe", text: "Physics Club" },
        { pos: [4, 2.2, -5.01], color: "#fecdd3", text: "Lab Safety" }
    ];

    return (
        <group>
            {/* Windows */}
            {[-5, 5].map((x, i) => (
                <group key={i} position={[x, windowY, windowZ]}>
                    <Plane args={[3.2, 2]} position={[0, 0, 0]}>
                        <meshStandardMaterial color="#c7e0ff" transparent opacity={0.5} />
                    </Plane>
                    <Box args={[3.3, 2.1, 0.06]} position={[0, 0, -0.03]}>
                        <meshStandardMaterial color="#cbd5e1" />
                    </Box>
                </group>
            ))}

            {/* Wall stripe */}
            <Plane args={[20, 1.4]} position={[0, 1.8, -5.01]} rotation={[0, 0, 0]}>
                <meshStandardMaterial color="#dbeafe" />
            </Plane>

            {/* Posters */}
            {posters.map((p, idx) => (
                <group key={idx} position={p.pos}>
                    <Plane args={[2, 1.2]} position={[0, 0, 0]}>
                        <meshStandardMaterial color={p.color} />
                    </Plane>
                    <Text position={[0, 0, 0.02]} fontSize={0.18} color="#111827" anchorX="center" anchorY="middle">
                        {p.text}
                    </Text>
                </group>
            ))}

            {/* Ceiling lights (emissive panels) */}
            {[-3.5, 3.5].map((x, idx) => (
                <Box key={idx} args={[3, 0.1, 1.2]} position={[x, 7.4, -1]}>
                    <meshStandardMaterial color="#e5e7eb" emissive="#fefce8" emissiveIntensity={0.8} />
                </Box>
            ))}
        </group>
    );
};

const ClassroomLighting = () => {
    return (
        <>
            <ambientLight intensity={0.5} color="#eef2ff" />
            <directionalLight
                position={[6, 10, 6]}
                intensity={1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <pointLight position={[-4, 6, 4]} intensity={0.5} />
            {/* Additional lighting for main avatar */}
            <spotLight
                position={[0, 5, 3]}
                angle={0.3}
                penumbra={0.35}
                intensity={1.1}
                castShadow
                target-position={[0, 1.5, 0]}
            />
        </>
    );
};

// Simple office environment built with basic geometry to avoid missing GLB issues
const BasicOffice = () => {
    return (
        <group>
            {/* Floor */}
            <Plane args={[16, 16]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#d7c4aa" />
            </Plane>

            {/* Walls */}
            <Plane args={[16, 7]} position={[0, 3.5, -8]} rotation={[0, 0, 0]}>
                <meshStandardMaterial color="#f2f4f8" />
            </Plane>
            <Plane args={[16, 7]} position={[0, 3.5, 8]} rotation={[0, Math.PI, 0]}>
                <meshStandardMaterial color="#e9ecf3" />
            </Plane>
            <Plane args={[16, 7]} position={[-8, 3.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <meshStandardMaterial color="#e6ecfc" />
            </Plane>
            <Plane args={[16, 7]} position={[8, 3.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <meshStandardMaterial color="#f5f7fb" />
            </Plane>

            {/* Window wall */}
            {[-4, 4].map((x, idx) => (
                <group key={idx} position={[x, 3.5, -7.99]}>
                    <Plane args={[3, 2]} position={[0, 0, 0]}>
                        <meshStandardMaterial color="#cde7ff" transparent opacity={0.45} />
                    </Plane>
                    <Box args={[3.1, 2.1, 0.1]} position={[0, 0, -0.06]}>
                        <meshStandardMaterial color="#cbd5e1" />
                    </Box>
                </group>
            ))}

            {/* Desk cluster */}
            <group position={[0, 0, -2.5]}>
                <Box args={[3.4, 0.18, 1.4]} position={[0, 1, 0]}>
                    <meshStandardMaterial color="#eef0f4" />
                </Box>
                <Box args={[0.16, 1.1, 0.16]} position={[-1.6, 0.55, -0.6]}>
                    <meshStandardMaterial color="#c5c9d6" />
                </Box>
                <Box args={[0.16, 1.1, 0.16]} position={[1.6, 0.55, -0.6]}>
                    <meshStandardMaterial color="#c5c9d6" />
                </Box>
                <Box args={[0.16, 1.1, 0.16]} position={[-1.6, 0.55, 0.6]}>
                    <meshStandardMaterial color="#c5c9d6" />
                </Box>
                <Box args={[0.16, 1.1, 0.16]} position={[1.6, 0.55, 0.6]}>
                    <meshStandardMaterial color="#c5c9d6" />
                </Box>
                {/* Screen */}
                <Box args={[1.6, 0.9, 0.06]} position={[0, 1.7, -0.5]}>
                    <meshStandardMaterial color="#111827" />
                </Box>
                {/* Accent lamp */}
                <group position={[1.8, 0, 0.4]}>
                    <Box args={[0.2, 1.2, 0.2]} position={[0, 0.6, 0]}>
                        <meshStandardMaterial color="#c9b39c" />
                    </Box>
                    <Box args={[0.8, 0.4, 0.8]} position={[0, 1.3, 0]}>
                        <meshStandardMaterial color="#9ca3af" />
                    </Box>
                </group>
            </group>

            {/* Sofa / seating */}
            <group position={[0, 0, 3]}>
                <Box args={[3.2, 0.65, 1.1]} position={[0, 0.325, 0]}>
                    <meshStandardMaterial color="#d6dde9" />
                </Box>
                <Box args={[3.2, 0.9, 0.25]} position={[0, 0.9, -0.45]}>
                    <meshStandardMaterial color="#c7cfdd" />
                </Box>
                <Box args={[0.3, 0.9, 1.1]} position={[-1.6, 0.9, 0]}>
                    <meshStandardMaterial color="#c7cfdd" />
                </Box>
                <Box args={[0.3, 0.9, 1.1]} position={[1.6, 0.9, 0]}>
                    <meshStandardMaterial color="#c7cfdd" />
                </Box>
                {/* Coffee table */}
                <group position={[0, 0, -1.8]}>
                    <Box args={[1.6, 0.1, 0.8]} position={[0, 0.4, 0]}>
                        <meshStandardMaterial color="#e9e5de" />
                    </Box>
                    <Box args={[0.12, 0.4, 0.12]} position={[-0.7, 0.2, -0.3]}>
                        <meshStandardMaterial color="#b7a38d" />
                    </Box>
                    <Box args={[0.12, 0.4, 0.12]} position={[0.7, 0.2, -0.3]}>
                        <meshStandardMaterial color="#b7a38d" />
                    </Box>
                    <Box args={[0.12, 0.4, 0.12]} position={[-0.7, 0.2, 0.3]}>
                        <meshStandardMaterial color="#b7a38d" />
                    </Box>
                    <Box args={[0.12, 0.4, 0.12]} position={[0.7, 0.2, 0.3]}>
                        <meshStandardMaterial color="#b7a38d" />
                    </Box>
                </group>
            </group>

            {/* Plants */}
            {[[-3, 0, -0.5], [3, 0, 0.8]].map((pos, idx) => (
                <group key={idx} position={pos}>
                    <Box args={[0.6, 0.6, 0.6]} position={[0, 0.3, 0]}>
                        <meshStandardMaterial color="#c9b39c" />
                    </Box>
                    <Box args={[0.35, 1.4, 0.35]} position={[0, 1.25, 0]}>
                        <meshStandardMaterial color="#8f6e4d" />
                    </Box>
                    <Box args={[1.2, 0.5, 1.2]} position={[0, 2, 0]}>
                        <meshStandardMaterial color="#3f8c55" />
                    </Box>
                </group>
            ))}

            {/* Wall art */}
            <Box args={[2.2, 1.2, 0.05]} position={[-5, 3.5, -7.95]}>
                <meshStandardMaterial color="#111827" />
            </Box>
            <Box args={[2.2, 1.2, 0.05]} position={[5, 3, -7.95]}>
                <meshStandardMaterial color="#2563eb" />
            </Box>
        </group>
    );
};

const StudioStage = () => {
    return (
        <group>
            {/* Backdrop */}
            <Box args={[16, 8, 0.5]} position={[0, 4, -8]}>
                <meshStandardMaterial color="#e8ecf5" />
            </Box>
            <Plane args={[16, 12]} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -0.2, -6]}>
                <meshStandardMaterial color="#e0e7f5" />
            </Plane>
            <Plane args={[20, 20]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                <meshStandardMaterial color="#edf2fb" />
            </Plane>

            {/* Accent panels */}
            <Box args={[0.3, 3, 8]} position={[-6, 2, -6]}>
                <meshStandardMaterial color="#c7d2fe" />
            </Box>
            <Box args={[0.3, 2.2, 6]} position={[6, 1.8, -5]}>
                <meshStandardMaterial color="#fbcfe8" />
            </Box>

            {/* Soft rim lights */}
            <pointLight position={[-5, 3, 5]} intensity={0.6} color="#bfdbfe" />
            <pointLight position={[5, 3, 5]} intensity={0.6} color="#fbcfe8" />
        </group>
    );
};

// Environment GLB configurations
const environmentModels = {
    // Built-in classroom (uses planes/boxes)
    'classroom': { type: 'builtin-classroom', backgroundColor: '#f4f6fb' },
    'classroom-lowpoly': {
        type: 'glb',
        path: '/environments/classroom-lowpoly.glb',
        position: [0, 0, -11],        // Вернул как у вас было
        scale: 0.7,                   // НЕ трогаем!
        rotation: [0, Math.PI / 2, 0] // Вернул как было
    },
    // Real office GLB when user downloads /environments/office.glb
    'office-glb': {
        type: 'glb',
        path: '/environments/office.glb',
        position: [0, -1.5, -6],
        scale: 0.8,
        rotation: [0, Math.PI, 0],
        backgroundColor: '#e8ecf5'
    },
    'office': {
        // Built-in simple office so it works even without external GLB
        type: 'basic-office',
        backgroundColor: '#eef1f6'
    },
    'forest': {
        type: 'glb',
        path: '/environments/forest.glb',
        position: [10, -68, -2],    // Опустили лес вниз (Y: -2)
        scale: 2,                  // Увеличили размер (было 1.5)
        rotation: [0, 0, 0]
    },
    'minimalistic_modern_office': {
        type: 'glb',
        path: '/environments/minimalistic_modern_office.glb',
        position: [0, -1.2, -6],
        scale: 1.2,
        rotation: [0, Math.PI, 0],
        backgroundColor: '#e9edf5'
    },
    'small_office': {
        type: 'glb',
        path: '/environments/small_office.glb',
        position: [0, -1.5, -5.5],
        scale: 1.1,
        rotation: [0, Math.PI, 0],
        backgroundColor: '#e8ecf5'
    },
    // HDRI preset (no download needed) - provides quick studio-like lighting
    'sunset-hdri': {
        type: 'studio',
        envPreset: 'studio',
        backgroundColor: '#e8ecf5'
    }
};

// GLB Environment component
const GLBEnvironment = ({ config }) => {
    const gltf = useGLTF(config.path);
    return (
        <group position={config.position} scale={config.scale} rotation={config.rotation}>
            <primitive object={gltf.scene} />
        </group>
    );
};

export const ClassroomExperience = ({ userAvatar, selectedEnvironment = 'classroom' }) => {
    const cameraControls = useRef();
    const { cameraZoomed } = useChat();
    const envConfig = environmentModels[selectedEnvironment] || environmentModels['classroom'];

    useEffect(() => {
        // Set initial camera position for classroom view - focused on main avatar
        cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0);
    }, []);

    useEffect(() => {
        if (cameraZoomed) {
            // Zoom in to avatar for close interaction
            cameraControls.current.setLookAt(0, 1.5, 1.5, 0, 1.5, 0, true);
        } else {
            // Full classroom view with avatar in focus
            cameraControls.current.setLookAt(0, 2.2, 5, 0, 1.0, 0, true);
        }
    }, [cameraZoomed]);

    return (
        <>
            <SceneBackground color={envConfig?.backgroundColor || '#f3f6fb'} />
            <CameraControls ref={cameraControls} />
            {/* Disable Environment preset completely - use manual lighting only */}
            <ContactShadows opacity={0.4} scale={5} blur={2.4} />

            <ClassroomLighting />

            {/* Conditional rendering: GLB model, HDRI preset, or built-in environments */}
            {envConfig?.type === 'glb' && (
                <Suspense fallback={
                    <group>
                        <Text position={[0, 1, 0]} fontSize={0.3} color="white">
                            Loading Environment...
                        </Text>
                    </group>
                }>
                    <GLBEnvironment config={envConfig} />
                </Suspense>
            )}

            {envConfig?.type === 'preset' && (
                <Suspense fallback={null}>
                    <Environment preset={envConfig.preset} background={envConfig.background} />
                </Suspense>
            )}

            {envConfig?.type === 'studio' && (
                <Suspense fallback={null}>
                    <Environment preset={envConfig.envPreset || 'studio'} background={false} />
                    <StudioStage />
                </Suspense>
            )}

            {envConfig?.type === 'basic-office' && (
                <BasicOffice />
            )}

            {envConfig?.type === 'builtin-classroom' && (
                <>
                    <ClassroomWalls />
                    <ClassroomFloor />
                    <ClassroomDecor />
                    <Whiteboard />
                    <ClassroomDesks />
                </>
            )}

            {/* Main Avatar (Selected by User) */}
            <Suspense fallback={
                <mesh position={[0, 0.85, 0]}>
                    <boxGeometry args={[0.4, 1.7, 0.3]} />
                    <meshLambertMaterial color="#4A90E2" />
                </mesh>
            }>
                <Avatar
                    modelPath={userAvatar}
                    position={[0, 0, 0]}
                    scale={1}
                />
            </Suspense>

            <Dots position={[0.4, 1.8, 0]} />
        </>
    );
}; 
