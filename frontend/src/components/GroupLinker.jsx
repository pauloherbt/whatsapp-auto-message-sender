import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Link2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupLinker({ lists, groups, fetchGroups, isFetchingGroups }) {
    const [selectedList, setSelectedList] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');

    const handleLink = async (e) => {
        e.preventDefault();
        if (!selectedList || !selectedGroup) return;

        try {
            const g = groups.find(x => String(x.id) === String(selectedGroup));
            await api.addGroupToList(selectedList, selectedGroup, g?.subject || 'Desconhecido');
            toast.success(`Grupo "${g?.subject || selectedGroup}" vinculado à lista!`);
            setSelectedGroup('');
        } catch (err) {
            toast.error('Erro ao vincular grupo: ' + err.message);
        }
    };

    return (
        <Card className="shadow-sm border-gray-100 bg-white/90 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-gray-500" /> Vincular Grupo
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchGroups} disabled={isFetchingGroups} className="text-xs h-8">
                    <RefreshCcw className={`w-3.5 h-3.5 mr-1 ${isFetchingGroups ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLink} className="flex flex-col gap-4">
                    <Combobox
                        options={lists.map(l => ({ label: l.name, value: String(l.id) }))}
                        value={selectedList}
                        onChange={setSelectedList}
                        placeholder="Pesquise e selecione a Lista..."
                    />

                    <Combobox
                        options={groups.map(g => ({ label: g.subject, value: String(g.id) }))}
                        value={selectedGroup}
                        onChange={setSelectedGroup}
                        placeholder={isFetchingGroups ? 'Carregando Grupos...' : 'Pesquise e selecione um Grupo...'}
                    />

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Vincular à Lista</Button>
                </form>
            </CardContent>
        </Card>
    );
}
