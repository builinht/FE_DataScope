import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";

export default function Callback() {
  const { handleRedirectCallback, isLoading, error, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    const processLogin = async () => {
      try {
        // If already authenticated, skip callback handling
        if (!isAuthenticated) {
          await handleRedirectCallback();
        }
        // Redirect to the dashboard or home page after login
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Callback error:", err);
        // Redirect to login page on error
        navigate("/login", { replace: true });
      }
    };

    processLogin();
  }, [handleRedirectCallback, navigate, isAuthenticated]);

  // Show a spinner while processing login
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Processing login...</p>
      </div>
    );
  }

  // Show error message if callback fails
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Login Error
          </h2>
          <p className="text-gray-700">{error.message}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Go Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Nothing to render; effect handles everything
  return null;
}
