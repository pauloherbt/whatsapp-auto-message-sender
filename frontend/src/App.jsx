import { useEffect, useState } from 'react';
import { api } from './lib/api';
import QRScanner from './components/QRScanner';
import Dashboard from './components/Dashboard';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    let interval;

    const checkStatus = async () => {
      try {
        const data = await api.getStatus();
        setIsConnected(data.connected);

        if (data.connected) {
          if (interval) clearInterval(interval);
        } else if (data.qr) {
          setQrCode(data.qr);
        }
      } catch (err) {
        console.error('Status check erro:', err);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 3 seconds if not connected
    if (!isConnected) {
      interval = setInterval(checkStatus, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  return (
    <div className="text-gray-800 antialiased min-h-screen flex flex-col items-center py-4 px-2 sm:py-6 sm:px-4 bg-gray-50">
      {/* Header */}
      <header className="w-full max-w-5xl flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 sm:mb-8 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-sm border border-gray-100 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 text-white p-2 rounded-lg shadow-sm">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">WPP Gerenciador de Grupos</h1>
        </div>
        <div>
          {isConnected ? (
            <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 font-semibold px-3 py-1 text-sm rounded-full">
              Conectado
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 font-semibold px-3 py-1 text-sm rounded-full">
              Aguardando QR Code
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-5xl">
        {isConnected ? (
          <Dashboard />
        ) : (
          <QRScanner qrCode={qrCode} />
        )}
      </div>

      {/* Sonner Toasts */}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
