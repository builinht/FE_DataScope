import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Records from "./pages/Records";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import useAuth from "./auth/useAuth";
import Navbar from "./components/Navbar";
import { Toaster } from "react-hot-toast";
import Analytics from "./pages/Analytics";

function App() {
  const { loading } = useAuth();

  return (
    <>
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
          {/* ✅ Navbar hiển thị cho cả khách lẫn user đăng nhập */}
          <Navbar />

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* ✅ Dashboard PUBLIC — khách vào được không cần đăng nhập */}
            <Route path="/" element={<Dashboard />} />

            {/* 🔒 Records — chỉ user đã đăng nhập */}
            <Route
              path="/records"
              element={
                <ProtectedRoute>
                  <Records />
                </ProtectedRoute>
              }
            />

            {/* 🔒 Analytics — chỉ user đã đăng nhập */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
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
