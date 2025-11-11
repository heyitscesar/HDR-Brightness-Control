import React from 'react';
import { useI18n } from '../../hooks/useI18n';

interface HeaderProps {
    wsStatus: 'connecting' | 'connected' | 'disconnected';
    onReconnectClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ wsStatus, onReconnectClick }) => {
  const { t } = useI18n();

  const statusIndicator = {
    connecting: { text: t('header.status.connecting'), color: 'bg-yellow-500' },
    connected: { text: t('header.status.connected'), color: 'bg-green-500' },
    disconnected: { text: t('header.status.disconnected'), color: 'bg-red-500' },
  };
  const currentStatus = statusIndicator[wsStatus];
  const isClickable = wsStatus === 'disconnected';

  return (
    <header className="bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white tracking-wide">
          {t('header.title')}
        </h1>
        <div className="flex items-center">
            <button
                onClick={isClickable ? onReconnectClick : undefined}
                className={`flex items-center gap-2 p-2 -m-2 rounded-md transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-700' : 'cursor-default'}`}
                disabled={!isClickable}
                aria-label={isClickable ? t('header.status.reconnect.ariaLabel') : currentStatus.text}
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