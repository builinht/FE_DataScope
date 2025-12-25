import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const Login = () => {
  const { loginWithRedirect, error } = useAuth0();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🌍 GeoInsight</h1>
          <p className="text-gray-600 mb-6">
            Sign in to access your geographic data dashboard
          </p>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
              <p className="text-red-700">Error: {error.message}</p>
            </div>
          )}
          
          <button
            onClick={() =>
              loginWithRedirect({
                redirectUri: `${window.location.origin}/callback`, // FIX: added callback URL
              })
            }
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            Log In
          </button>
          
          <div className="mt-6 text-xs text-gray-500">
            <p>Don't have an account? You'll be able to create one during login.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
