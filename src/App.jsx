import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import CodeEditor from "./components/Editor";
// import './App.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please refresh the page.</h1>;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <div>
      <Router basename={import.meta.env.VITE_PUBLIC_URL}>
        <ErrorBoundary>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/:id" element={<CodeEditor />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </Router>
    </div>
  );
}

export default App;
