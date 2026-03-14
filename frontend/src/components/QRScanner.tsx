import { useEffect, useState } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, RefreshCw, QrCode, Smartphone } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const QR_TTL_SECONDS = 20;

interface QRScannerProps {
    qrCode: string | null;
    qrGeneratedAt: number | null;
    isAuthenticating: boolean;
}

export default function QRScanner({ qrCode, qrGeneratedAt, isAuthenticating }: QRScannerProps) {
    const [tab, setTab] = useState<'qr' | 'code'>('qr');
    const [phone, setPhone] = useState('');
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState<number>(QR_TTL_SECONDS);
    const [isExpired, setIsExpired] = useState(false);

    const cleanQrCode = qrCode?.startsWith('undefined,') ? qrCode.substring(10) : qrCode;

    // Countdown for QR freshness
    useEffect(() => {
        if (!qrGeneratedAt) return;
        const tick = () => {
            const ageMs = Date.now() - qrGeneratedAt;
            const left = Math.max(0, QR_TTL_SECONDS - Math.floor(ageMs / 1000));
            setSecondsLeft(left);
            setIsExpired(left === 0);
        };
        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [qrGeneratedAt]);

    const handleRequestCode = async () => {
        if (!phone) { toast.error('Digite seu número de telefone'); return; }
        setIsRequesting(true);
        try {
            const data = await api.requestPairingCode(phone);
            setPairingCode(data.code);
            toast.success('Código gerado! Insira-o no WhatsApp.');
        } catch (err: any) {
            toast.error('Erro ao gerar código: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsRequesting(false);
        }
    };

    const progress = (secondsLeft / QR_TTL_SECONDS) * 100;
    const isUrgent = secondsLeft <= 5 && secondsLeft > 0;

    if (isAuthenticating) {
        return (
            <div className="flex justify-center mt-10">
                <Card className="w-full max-w-sm shadow-lg border-gray-100 bg-white/90 backdrop-blur-md">
                    <CardContent className="flex flex-col items-center gap-4 py-12">
                        <div className="animate-bounce p-4 bg-green-50 rounded-full text-green-600">
                            <Check className="w-12 h-12" />
                        </div>
                        <p className="text-sm font-semibold text-center text-green-700">
                            Autenticado! Finalizando sincronização...
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100/50 px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            Sincronizando conversas (pode levar 1-2 min)
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center mt-10">
            <Card className="w-full max-w-sm shadow-lg border-gray-100 bg-white/90 backdrop-blur-md overflow-hidden">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold">Conectar WhatsApp</CardTitle>
                    <CardDescription>Escolha como deseja vincular sua conta.</CardDescription>
                </CardHeader>

                {/* Tab selector */}
                <div className="flex mx-6 mb-2 bg-gray-100 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => setTab('qr')}
                        className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-1.5 rounded-md transition-all ${tab === 'qr' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <QrCode className="w-4 h-4" /> QR Code
                    </button>
                    <button
                        onClick={() => setTab('code')}
                        className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-1.5 rounded-md transition-all ${tab === 'code' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Smartphone className="w-4 h-4" /> Código
                    </button>
                </div>

                <CardContent className="flex flex-col items-center gap-3">
                    {tab === 'qr' ? (
                        <>
                            {/* QR area */}
                            <div className={`relative bg-white p-3 rounded-2xl shadow-inner border-4 border-gray-50 flex justify-center items-center min-h-[280px] min-w-[280px] transition-all duration-300 ${isExpired ? 'opacity-30' : ''}`}>
                                {cleanQrCode ? (
                                    <>
                                        <QRCode value={cleanQrCode} size={260} level="H" includeMargin={false} />
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

                            {/* Countdown bar */}
                            {cleanQrCode && (
                                <div className="w-full flex flex-col gap-1">
                                    <div className="flex justify-between text-xs text-gray-400 px-1">
                                        <span>Validade do QR</span>
                                        <span className={isUrgent ? 'text-red-500 font-bold' : ''}>
                                            {isExpired ? 'Expirando...' : `${secondsLeft}s`}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${isExpired ? 'bg-red-400' : isUrgent ? 'bg-orange-400' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-gray-400 text-center px-2">
                                Abra o WhatsApp → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → Aponte para o QR.
                            </p>
                        </>
                    ) : (
                        <>
                            {/* Pairing Code UI */}
                            <div className="w-full flex flex-col gap-3 py-4">
                                {pairingCode ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="bg-green-50 border border-green-200 rounded-2xl px-8 py-6 text-center">
                                            <p className="text-xs text-green-600 font-medium mb-2">Seu código de pareamento</p>
                                            <p className="text-4xl font-mono font-bold tracking-widest text-green-700">{pairingCode}</p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setPairingCode(null)} className="text-xs">
                                            Solicitar novo código
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                                                Seu número de WhatsApp
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="5511999999999"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                            />
                                            <p className="text-xs text-gray-400 mt-1">DDI + DDD + número, sem espaços ou traços.</p>
                                        </div>
                                        <Button
                                            onClick={handleRequestCode}
                                            disabled={isRequesting}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            {isRequesting ? 'Gerando código...' : 'Gerar código'}
                                        </Button>
                                    </>
                                )}

                                {!pairingCode && (
                                    <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                                        <p className="font-semibold text-gray-600">Como usar:</p>
                                        <p>1. Digite seu número e clique em <strong>Gerar código</strong></p>
                                        <p>2. No WhatsApp: <strong>Dispositivos conectados → Conectar com número de telefone</strong></p>
                                        <p>3. Insira o código de 8 dígitos exibido aqui</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100/50 px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Aguardando vinculação do dispositivo
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
