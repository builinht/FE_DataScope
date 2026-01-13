import { Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Hiển thị spinner full-screen khi đang load user
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  // Nếu chưa đăng nhập, redirect về login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Nếu đã login, render component con
  return children;
}
