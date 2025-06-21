import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import CodeEditor from "./components/Editor";
// import './App.css';

function App() {
  return (
    <div>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:id" element={<CodeEditor />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
