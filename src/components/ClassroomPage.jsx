import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { ClassroomExperience } from "./ClassroomExperience";
import { ClassroomUI } from "./ClassroomUI";
import { useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useChat } from "../hooks/useChat";

export const ClassroomPage = () => {
    const location = useLocation();
    const selections = location.state;
    const { setLanguage, setVoiceGender } = useChat();

    // Redirect to landing if no selections available
    if (!selections) {
        return <Navigate to="/" replace />;
    }

    // Initialize settings from landing page selections
    useEffect(() => {
        if (selections.language) {
            setLanguage(selections.language);
        }
        if (selections.voiceGender) {
            setVoiceGender(selections.voiceGender);
        }
    }, [selections, setLanguage, setVoiceGender]);

    return (
        <>
            <Loader />
            <Leva hidden />
            <ClassroomUI userInfo={selections}>
                <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }}>
                    <ClassroomExperience
                        userAvatar={selections.avatar}
                        selectedEnvironment={selections.environment}
                    />
                </Canvas>
            </ClassroomUI>
        </>
    );
}; 