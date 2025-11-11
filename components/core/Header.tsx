import React from 'react';

interface HeaderProps {
    wsStatus: 'connecting' | 'connected' | 'disconnected';
    onReconnectClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ wsStatus, onReconnectClick }) => {
  const statusIndicator = {
    connecting: { text: 'Connecting...', color: 'bg-yellow-500' },
    connected: { text: 'Connected', color: 'bg-green-500' },
    disconnected: { text: 'Disconnected', color: 'bg-red-500' },
  };
  const currentStatus = statusIndicator[wsStatus];
  const isClickable = wsStatus === 'disconnected';

  return (
    <header className="bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-wide">
          Adaptive Brightness Control
        </h1>
        <div className="flex items-center">
            <button
                onClick={isClickable ? onReconnectClick : undefined}
                className={`flex items-center gap-2 p-2 -m-2 rounded-md transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-700' : 'cursor-default'}`}
                disabled={!isClickable}
                aria-label={isClickable ? "Click to try reconnecting to the server" : currentStatus.text}
            >
                <div className={`w-3 h-3 rounded-full ${currentStatus.color}`}></div>
                <span className="text-sm text-gray-300">{currentStatus.text}</span>
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
