import React from 'react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white px-4">
      <div className="text-9xl font-bold mb-6 text-red-500">404</div>
      <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">Page Not Found</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        This content is only available when accessed through hiicine.vercel.app
      </p>
      <a 
        href="https://hiicine.vercel.app"
        className="px-6 py-3 bg-gradient-to-r from-red-600 to-purple-600 rounded-full hover:from-red-500 hover:to-purple-500 transition-all duration-300 font-medium"
      >
        Go to hiicine.vercel.app
      </a>
    </div>
  );
};

export default NotFoundPage;