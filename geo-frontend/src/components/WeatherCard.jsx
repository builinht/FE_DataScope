import React from 'react';

const WeatherCard = ({ weather, capital, className = '' }) => {
  const getWeatherIcon = (description) => {
    const desc = description?.toLowerCase() || '';
    if (desc.includes('clear')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain')) return '🌧️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('storm') || desc.includes('thunder')) return '⛈️';
    if (desc.includes('mist') || desc.includes('fog')) return '🌫️';
    return '🌤️';
  };

  const getTemperatureColor = (temp) => {
    if (temp === 'N/A') return 'text-gray-600';
    const temperature = Number(temp);
    if (temperature < 0) return 'text-blue-600';
    if (temperature < 10) return 'text-blue-500';
    if (temperature < 20) return 'text-green-600';
    if (temperature < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          🌤️ Weather Information
        </h3>
        <span className="text-2xl">{getWeatherIcon(weather.description)}</span>
      </div>
      
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600 mb-1">Current weather in</p>
        <p className="text-lg font-semibold text-gray-800">{capital}</p>
      </div>

      <div className="space-y-3">
        <div className="text-center py-3 bg-gray-50 rounded-lg">
          <span className={`text-3xl font-bold ${getTemperatureColor(weather.temperature)}`}>
            {weather.temperature}°C
          </span>
          {weather.feelsLike && weather.feelsLike !== 'N/A' && (
            <p className="text-sm text-gray-600 mt-1">
              Feels like {weather.feelsLike}°C
            </p>
          )}
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">Conditions:</span>
          <span className="text-sm text-gray-800 capitalize">{weather.description}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">Humidity:</span>
          <span className="text-sm text-gray-800">{weather.humidity}%</span>
        </div>
        
        {weather.pressure && weather.pressure !== 'N/A' && (
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-gray-600">Pressure:</span>
            <span className="text-sm text-gray-800">{weather.pressure} hPa</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherCard;