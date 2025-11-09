import React from 'react';

interface HeaderProps {
    wsStatus: 'connecting' | 'connected' | 'disconnected';
}

const Header: React.FC<HeaderProps> = ({ wsStatus }) => {
  const statusIndicator = {
    connecting: { text: 'Connecting...', color: 'bg-yellow-500' },
    connected: { text: 'Connected', color: 'bg-green-500' },
    disconnected: { text: 'Disconnected', color: 'bg-red-500' },
  };
  const currentStatus = statusIndicator[wsStatus];

  return (
    <header className="bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-wide">
          Adaptive Brightness Control
        </h1>
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${currentStatus.color}`}></div>
            <span className="text-sm text-gray-300">{currentStatus.text}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
