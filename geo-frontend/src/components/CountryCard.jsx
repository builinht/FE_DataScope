import React from 'react';

const CountryCard = ({ metadata, country, className = '' }) => {
  const formatPopulation = (population) => {
    if (!population || population === 'N/A') return 'N/A';
    return Number(population).toLocaleString();
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          🏛️ Country Information
        </h3>
        {metadata.flag && (
          <img 
            src={metadata.flag} 
            alt={`${country} flag`} 
            className="h-8 w-12 object-cover rounded border"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">Country:</span>
          <span className="text-sm text-gray-800 font-semibold">{country}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">Capital:</span>
          <span className="text-sm text-gray-800">{metadata.capital}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">Population:</span>
          <span className="text-sm text-gray-800">{formatPopulation(metadata.population)}</span>
        </div>
        
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">Currency:</span>
          <span className="text-sm text-gray-800">{metadata.currency}</span>
        </div>
        
        {metadata.languages && metadata.languages.length > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Languages:</span>
            <span className="text-sm text-gray-800 text-right">
              {metadata.languages.join(', ')}
            </span>
          </div>
        )}
        
        {metadata.region && (
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-gray-600">Region:</span>
            <span className="text-sm text-gray-800">{metadata.region}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryCard;