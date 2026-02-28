import React, { useEffect, useRef } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function QRScanner({ qrCode }) {
    return (
        <div className="flex justify-center mt-10">
            <Card className="w-full max-w-md shadow-lg border-gray-100 bg-white/90 backdrop-blur-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold mb-2">Conectar WhatsApp</CardTitle>
                    <CardDescription className="text-gray-500">
                        Escaneie o código QR abaixo para vincular sua conta admin.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100 flex justify-center items-center min-h-[250px] min-w-[250px]">
                        {qrCode ? (
                            <QRCode value={qrCode} size={250} level="M" />
                        ) : (
                            <div className="animate-pulse w-[250px] h-[250px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                Carregando QR...
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-gray-400 animate-pulse mt-2">Aguardando leitura...</p>
                </CardContent>
            </Card>
        </div>
    );
}
