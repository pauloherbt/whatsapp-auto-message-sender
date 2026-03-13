import { useEffect, useState } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, RefreshCw } from 'lucide-react';

const QR_TTL_SECONDS = 20; // WhatsApp QR codes expire after ~20 seconds

interface QRScannerProps {
    qrCode: string | null;
    qrGeneratedAt: number | null;
    isAuthenticating: boolean;
}

export default function QRScanner({ qrCode, qrGeneratedAt, isAuthenticating }: QRScannerProps) {
    const [secondsLeft, setSecondsLeft] = useState<number>(QR_TTL_SECONDS);
    const [isExpired, setIsExpired] = useState(false);

    const cleanQrCode = qrCode?.startsWith('undefined,')
        ? qrCode.substring(10)
        : qrCode;

    // Reset countdown whenever a new QR arrives
    useEffect(() => {
        if (!qrGeneratedAt) return;

        const tick = () => {
            const ageMs = Date.now() - qrGeneratedAt;
            const left = Math.max(0, QR_TTL_SECONDS - Math.floor(ageMs / 1000));
            setSecondsLeft(left);
            setIsExpired(left === 0);
        };

        tick(); // run immediately
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [qrGeneratedAt]);

    const progress = (secondsLeft / QR_TTL_SECONDS) * 100;
    const isUrgent = secondsLeft <= 5 && secondsLeft > 0;

    return (
        <div className="flex justify-center mt-10">
            <Card className="w-full max-w-sm shadow-lg border-gray-100 bg-white/90 backdrop-blur-md overflow-hidden">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold">Conectar WhatsApp</CardTitle>
                    <CardDescription>
                        {isAuthenticating
                            ? 'Conexão detectada!'
                            : 'Aponte a câmera do seu celular para vincular a conta.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                    {/* QR area */}
                    <div className={`relative bg-white p-3 rounded-2xl shadow-inner border-4 border-gray-50 flex justify-center items-center min-h-[280px] min-w-[280px] transition-all duration-300 ${isExpired ? 'opacity-30' : ''}`}>
                        {isAuthenticating ? (
                            <div className="flex flex-col items-center gap-4 text-green-600">
                                <div className="animate-bounce p-4 bg-green-50 rounded-full">
                                    <Check className="w-12 h-12" />
                                </div>
                                <span className="text-sm font-semibold text-center px-4">
                                    Autenticado! Finalizando sincronização...
                                </span>
                            </div>
                        ) : cleanQrCode ? (
                            <>
                                <QRCode
                                    value={cleanQrCode}
                                    size={260}
                                    level="H"
                                    includeMargin={false}
                                    className="transition-opacity duration-500"
                                />
                                {/* Expired overlay */}
                                {isExpired && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-sm rounded-2xl">
                                        <RefreshCw className="w-8 h-8 text-gray-500 animate-spin" />
                                        <span className="text-sm font-semibold text-gray-600">Atualizando QR...</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-gray-400">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                                <span className="text-sm font-medium">Buscando QR...</span>
                            </div>
                        )}
                    </div>

                    {/* Countdown bar — only show when QR is active */}
                    {cleanQrCode && !isAuthenticating && (
                        <div className="w-full flex flex-col gap-1">
                            <div className="flex justify-between text-xs text-gray-400 px-1">
                                <span>Validade do QR</span>
                                <span className={isUrgent ? 'text-red-500 font-bold' : ''}>
                                    {isExpired ? 'Expirando...' : `${secondsLeft}s`}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${isExpired ? 'bg-red-400' :
                                            isUrgent ? 'bg-orange-400' :
                                                'bg-green-500'
                                        }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100/50 px-3 py-1.5 rounded-full">
                        <div className={`w-2 h-2 rounded-full ${isAuthenticating ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`}></div>
                        {isAuthenticating ? 'Sincronizando conversas (pode levar 1-2 min)' : 'Aguardando leitura do dispositivo'}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
