import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ResumeUpload from "./pages/ResumeUpload";
import JobRecommendations from "./pages/JobRecommendations";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/resume-upload" element={<ResumeUpload />} />
        <Route path="/job-recommendations" element={<JobRecommendations />} />
      </Routes>
    </Router>
  );
}
