import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AnalysisPage from "./components/AnalysisPage";
import { FileProvider } from "./contexts/FileContext";

function App() {
  return (
    <FileProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
      </Router>
    </FileProvider>
  );
}

export default App;
