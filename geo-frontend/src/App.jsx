import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Records from "./pages/Records";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Callback from "./pages/Callback";
import { useAuth0 } from "@auth0/auth0-react";

function App() {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      {/* Navigation shown only when authenticated */}
      {isAuthenticated && (
        <nav className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <h1 className="font-bold text-xl">GeoInsight</h1>
          <div className="space-x-4">
            <Link to="/" className="hover:underline">Dashboard</Link>
            <Link to="/records" className="hover:underline">Records</Link>
          </div>
        </nav>
      )}
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} /> {/* NEW: Callback route */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

// Separate component for authenticated content
function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/records" element={<Records />} />
    </Routes>
  );
}

export default App;
