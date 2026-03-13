import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LandingPage } from "./components/LandingPage";
import { ClassroomPage } from "./components/ClassroomPage";
import { PreConferencePage } from "./components/PreConferencePage";
import { ChatProvider } from "./hooks/useChat";
import { ApiConfigProvider } from "./contexts/ApiConfigContext";

function App() {
  return (
    <ApiConfigProvider>
      <ChatProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pre-conference" element={<PreConferencePage />} />
            <Route path="/classroom" element={<ClassroomPage />} />
          </Routes>
        </Router>
      </ChatProvider>
    </ApiConfigProvider>
  );
}

export default App;
