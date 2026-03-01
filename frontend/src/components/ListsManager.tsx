import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderOpen, Edit2, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ListsManager({ lists, fetchLists, openManageModal }) {
    const [newListName, setNewListName] = useState('');

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newListName.trim()) return;
        try {
            await api.createList(newListName.trim());
            setNewListName('');
            fetchLists();
            toast.success('Lista criada com sucesso!');
        } catch (err) {
            toast.error('Erro ao criar lista: ' + err.message);
        }
    };

    const handleRename = async (id, currentName) => {
        const newName = prompt(`Digite o novo nome para a lista "${currentName}":`, currentName);
        if (!newName || newName.trim() === '' || newName === currentName) return;
        try {
            await api.renameList(id, newName.trim());
            fetchLists();
            toast.success('Lista renomeada!');
        } catch (err) {
            toast.error('Erro ao renomear lista: ' + err.message);
        }
    };

    const handleDelete = async (id, currentName) => {
        if (!window.confirm(`Tem certeza de que deseja apagar permanentemente a lista "${currentName}"?`)) return;
        try {
            await api.deleteList(id);
            fetchLists();
            toast.success('Lista excluída!');
        } catch (err) {
            toast.error('Erro ao excluir lista: ' + err.message);
        }
    };

    return (
        <Card className="shadow-sm border-gray-100 mb-6 bg-white/90 backdrop-blur-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-gray-500" /> Listas de Destino
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 mb-4">
                    <Input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Nome da nova lista"
                        required
                        className="flex-1"
                    />
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">Criar</Button>
                </form>

                <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {lists.length === 0 ? (
                        <p className="text-sm text-gray-500 italic p-2">Nenhuma lista encontrada.</p>
                    ) : (
                        lists.map((l) => (
                            <li key={l.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm group gap-3 sm:gap-0">
                                <div className="w-full sm:w-auto flex justify-between sm:block">
                                    <span className="font-medium text-gray-800 truncate max-w-[150px] sm:max-w-[200px] inline-block align-middle">{l.name}</span>
                                    <span className="text-xs font-mono text-gray-400 bg-white px-2 py-1 rounded border ml-2 inline-block align-middle">ID: {l.id}</span>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" onClick={() => handleRename(l.id, l.name)} className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(l.id, l.name)} className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50">
                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Deletar
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => openManageModal(l)} className="h-8 px-3 ml-1 bg-white border">
                                        <Users className="w-3.5 h-3.5 mr-1" /> Grupos
                                    </Button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </CardContent>
        </Card>
    );
}
