import React from 'react';

const ProtectedPage = () => {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white px-4">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">Protected Content</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        This content is only accessible through the website.
      </p>
    </div>
  );
};

export default ProtectedPage;