import { useEffect, useRef, useState } from 'react';
import { api } from './lib/api';
import LoginPage from './components/LoginPage';
import QRScanner from './components/QRScanner';
import Dashboard from './components/Dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, LogOut } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('wpp_token'));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('wpp_email'));

  // WhatsApp state
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrGeneratedAt, setQrGeneratedAt] = useState<number | null>(null);
  const isConnectedRef = useRef(false);

  const handleAuthenticated = (newToken: string, email: string) => {
    setToken(newToken);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('wpp_token');
    localStorage.removeItem('wpp_email');
    setToken(null);
    setUserEmail(null);
    setIsConnected(false);
    setQrCode(null);
  };

  // Poll WhatsApp status — only when logged in
  useEffect(() => {
    if (!token) return;

    const checkStatus = async () => {
      try {
        const data = await api.getStatus();
        isConnectedRef.current = data.connected;
        setIsConnected(data.connected);
        setIsAuthenticating(data.authenticating);
        if (data.connected) {
          setQrCode(null);
          setQrGeneratedAt(null);
        } else if (data.qr) {
          setQrCode(data.qr);
          if (data.qrGeneratedAt) setQrGeneratedAt(data.qrGeneratedAt);
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    };

    checkStatus();

    let timeoutId: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (isConnectedRef.current) return;
      await checkStatus();
      timeoutId = setTimeout(poll, 3000);
    };

    timeoutId = setTimeout(poll, 3000);
    return () => clearTimeout(timeoutId);
  }, [token]);

  // Show login page if not authenticated
  if (!token) {
    return (
      <>
        <LoginPage onAuthenticated={handleAuthenticated} />
        <Toaster position="bottom-right" richColors />
      </>
    );
  }

  return (
    <div className="text-gray-800 antialiased min-h-screen flex flex-col items-center py-4 px-2 sm:py-6 sm:px-4 bg-gray-50">
      {/* Header */}
      <header className="w-full max-w-5xl flex flex-col sm:flex-row gap-4 justify-between items-center mb-6 sm:mb-8 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-sm border border-gray-100 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 text-white p-2 rounded-lg shadow-sm">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">WPP Gerenciador de Grupos</h1>
            <p className="text-xs text-gray-400">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 font-semibold px-3 py-1 text-sm rounded-full">
              Conectado
            </Badge>
          ) : isAuthenticating ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-semibold px-3 py-1 text-sm rounded-full">
              Autenticando...
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 font-semibold px-3 py-1 text-sm rounded-full">
              Aguardando QR Code
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-500">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-5xl">
        {isConnected ? (
          <Dashboard />
        ) : (
          <QRScanner qrCode={qrCode} qrGeneratedAt={qrGeneratedAt} isAuthenticating={isAuthenticating} />
        )}
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
