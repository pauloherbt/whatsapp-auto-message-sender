import listRepo from '../../infrastructure/persistence/SqliteListRepository';

class ManageLists {
    create(userId: number, name: string) {
        return listRepo.create(userId, name);
    }

    getAll(userId: number) {
        return listRepo.getAll(userId);
    }

    getById(id: number | string) {
        return listRepo.getById(id);
    }

    rename(id: number | string, newName: string) {
        const existing = listRepo.getById(id);
        if (!existing) throw new Error(`Lista ID ${id} não encontrada para edição.`);
        return listRepo.update(id, newName);
    }

    remove(id: number | string) {
        const existing = listRepo.getById(id);
        if (!existing) throw new Error(`Lista ID ${id} não encontrada para exclusão.`);
        return listRepo.delete(id);
    }
}

export default ManageLists;
