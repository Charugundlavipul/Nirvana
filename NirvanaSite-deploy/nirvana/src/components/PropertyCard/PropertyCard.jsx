import React from 'react';

const PropertyCard = ({ title, image, isSelected, onClick }) => {
  return (
    <div
      className={`
        cursor-pointer rounded-xl overflow-hidden transition-all duration-300 border-2 w-64 md:w-72 bg-white flex-shrink-0
        ${isSelected ? 'border-primary shadow-lg scale-105 opacity-100 ring-2 ring-primary/20' : 'border-transparent shadow-md opacity-80 hover:opacity-100 hover:-translate-y-1'}
      `}
      onClick={onClick}
    >
      <div className="h-40 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          loading="lazy"
        />
      </div>
      <div className="p-4 text-center">
        <h3 className={`font-bold text-lg ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
          {title}
        </h3>
      </div>
    </div>
  );
};

export default PropertyCard;