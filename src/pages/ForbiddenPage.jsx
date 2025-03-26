import React from 'react';

const ForbiddenPage = () => {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white px-4">
      <div className="text-9xl font-bold mb-6 text-red-500">403</div>
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">Access Forbidden</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        Direct API requests are not allowed. This content is only accessible through the website.
      </p>
    </div>
  );
};

export default ForbiddenPage;