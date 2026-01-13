import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Records from "./pages/Records";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import useAuth from "./auth/useAuth";
import Navbar from "./components/Navbar";
import { Toaster } from "react-hot-toast";

function App() {
  const { loading, isAuthenticated } = useAuth();

  return (
    <>
      {/* ✅ TOASTER LUÔN LUÔN TỒN TẠI */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: { fontSize: "14px" },
        }}
      />

      {loading ? (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      ) : (
        <Router>
          {isAuthenticated && <Navbar />}

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/records" element={<Records />} />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      )}
    </>
  );
}

export default App;
