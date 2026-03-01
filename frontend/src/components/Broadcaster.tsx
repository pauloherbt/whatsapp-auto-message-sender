import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RadioTower, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function Broadcaster({ lists, history, fetchHistory }) {
    const [selectedList, setSelectedList] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!selectedList || !message) return;

        if (!window.confirm('Tem certeza de que deseja disparar essa mensagem para todos os grupos da lista?')) return;

        setIsSending(true);
        try {
            const res = await api.sendBroadcast(selectedList, message);
            toast.success(`Disparo concluído! Enviado com sucesso para ${res.success} de ${res.total} grupos.`);
            setMessage('');
            fetchHistory();
        } catch (err) {
            toast.error('Erro no disparo: ' + err.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Broadcast Form */}
            <Card className="shadow-sm border-gray-100 bg-white/90 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <RadioTower className="w-5 h-5 text-gray-500" /> Disparo de Mensagem
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleBroadcast} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lista de Destino</label>
                            <Combobox
                                options={lists.map(l => ({ label: l.name, value: String(l.id) }))}
                                value={selectedList}
                                onChange={setSelectedList}
                                placeholder="Pesquise e selecione a Lista p/ Disparo..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                                rows={4}
                                placeholder="Digite sua mensagem de disparo aqui..."
                                className="resize-none"
                            />
                        </div>
                        <Button type="submit" disabled={isSending} className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold flex gap-2">
                            {isSending ? (
                                <>Enviando...</>
                            ) : (
                                <><Send className="w-4 h-4" /> Iniciar Disparo</>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card className="shadow-sm border-gray-100 bg-white/90 backdrop-blur-md flex-1">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-gray-500" /> Disparos Recentes
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Horário</TableHead>
                                <TableHead>Lista</TableHead>
                                <TableHead>Sucesso</TableHead>
                                <TableHead>Mensagem</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center italic text-gray-500 py-4">
                                        Nenhum histórico de disparo.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((h, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-mono text-xs whitespace-nowrap">
                                            {new Date(h.sent_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>ID: {h.list_id}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                                                {h.success} / {h.total_groups}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="truncate max-w-[200px]" title={h.content}>
                                            {h.content}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
