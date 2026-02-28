import React, { useEffect, useRef } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function QRScanner({ qrCode }) {
    // Some versions of the library or specific session states might return 'undefined,' as a prefix.
    // We sanitize it here to ensure the QRCode component receives a valid value.
    const cleanQrCode = qrCode?.startsWith('undefined,')
        ? qrCode.substring(10)
        : qrCode;

    return (
        <div className="flex justify-center mt-10">
            <Card className="w-full max-w-sm shadow-lg border-gray-100 bg-white/90 backdrop-blur-md overflow-hidden">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold">Conectar WhatsApp</CardTitle>
                    <CardDescription>
                        Aponte a câmera do seu celular para vincular a conta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl shadow-inner mb-4 border-4 border-gray-50 flex justify-center items-center min-h-[280px] min-w-[280px]">
                        {cleanQrCode ? (
                            <QRCode
                                value={cleanQrCode}
                                size={260}
                                level="H"
                                includeMargin={false}
                                className="transition-opacity duration-500"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-gray-400">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                                <span className="text-sm font-medium">Buscando QR...</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100/50 px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Aguardando leitura do dispositivo
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
