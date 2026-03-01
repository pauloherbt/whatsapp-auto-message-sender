import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ListsManager from './ListsManager';
import GroupLinker from './GroupLinker';
import Broadcaster from './Broadcaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Dashboard() {
    const [lists, setLists] = useState([]);
    const [groups, setGroups] = useState([]);
    const [history, setHistory] = useState([]);
    const [isFetchingGroups, setIsFetchingGroups] = useState(false);

    // State for Managing list modal
    const [manageList, setManageList] = useState(null);
    const [listGroups, setListGroups] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchLists();
        fetchGroups();
        fetchHistory();
    }, []);

    const fetchLists = async () => {
        try {
            const data = await api.getLists();
            setLists(data);
        } catch (err) {
            toast.error('Erro ao buscar listas: ' + err.message);
        }
    };

    const fetchGroups = async () => {
        setIsFetchingGroups(true);
        try {
            const data = await api.getWhatsAppGroups();
            setGroups(data);
        } catch (err) {
            toast.error('Erro ao carregar os grupos. Clique em Atualizar.');
        } finally {
            setIsFetchingGroups(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const data = await api.getHistory();
            setHistory(data);
        } catch (err) {
            console.error(err);
        }
    };

    const openManageModal = async (list) => {
        setManageList(list);
        setListGroups([]);
        setIsModalOpen(true);
        try {
            const data = await api.getGroupsInList(list.id);
            setListGroups(data);
        } catch (err) {
            toast.error('Erro carregando grupos da lista: ' + err.message);
        }
    };

    const handleRemoveGroupFromList = async (groupId, groupName) => {
        if (!window.confirm(`Remover o grupo "${groupName}" desta lista?`)) return;
        try {
            await api.removeGroupFromList(groupId);
            // refresh modal
            if (manageList) await openManageModal(manageList);
            toast.success('Grupo removido da lista');
        } catch (err) {
            toast.error('Erro ao remover o grupo: ' + err.message);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
            <div className="col-span-1 flex flex-col gap-4 sm:gap-6">
                <ListsManager
                    lists={lists}
                    fetchLists={fetchLists}
                    openManageModal={openManageModal}
                />
                <GroupLinker
                    lists={lists}
                    groups={groups}
                    fetchGroups={fetchGroups}
                    isFetchingGroups={isFetchingGroups}
                />
            </div>

            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4 sm:gap-6">
                <Broadcaster
                    lists={lists}
                    history={history}
                    fetchHistory={fetchHistory}
                />
            </div>

            {/* Internal Modal for managing list items */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] flex flex-col bg-white/95 backdrop-blur-md">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="text-xl font-bold">Gerenciar Lista: {manageList?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-gray-500 my-2">
                        Grupos que pertencem a esta lista no momento:
                    </div>
                    <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {listGroups.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">Nenhum grupo vinculado ainda.</p>
                        ) : (
                            listGroups.map(g => (
                                <li key={g.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium text-gray-700 truncate">{g.name || 'Sem nome'}</span>
                                        <span className="text-xs text-gray-400 font-mono truncate">{g.wpp_group_id}</span>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRemoveGroupFromList(g.id, g.name || g.wpp_group_id)}
                                        className="shrink-0 h-8 px-2"
                                    >
                                        Remover
                                    </Button>
                                </li>
                            ))
                        )}
                    </ul>
                </DialogContent>
            </Dialog>
        </div>
    );
}
