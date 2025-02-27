import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AnalysisPage from "./components/AnalysisPage";
import FullscreenChartPage from "./components/FullscreenChartPage";
import { FileProvider } from "./contexts/FileContext";

function App() {
  return (
    <FileProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/chart/univariate/:variable1" element={<FullscreenChartPage />} />
          <Route path="/chart/bivariate/:variable1/:variable2" element={<FullscreenChartPage />} />
        </Routes>
      </Router>
    </FileProvider>
  );
}

export default App;
