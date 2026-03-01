import groupRepo from '../../infrastructure/persistence/SqliteGroupRepository';
import listRepo from '../../infrastructure/persistence/SqliteListRepository';

class ManageGroups {
    private groupRepo: typeof groupRepo;
    private listRepo: typeof listRepo;

    constructor(
        gRepo: typeof groupRepo,
        lRepo: typeof listRepo
    ) {
        this.groupRepo = gRepo;
        this.listRepo = lRepo;
    }

    add(listId: number | string, wppGroupId: string, name: string = '') {
        const list = this.listRepo.getById(listId);
        if (!list) throw new Error(`Lista ID ${listId} não encontrada.`);
        return this.groupRepo.add(listId, wppGroupId, name);
    }

    forList(listId: number | string) {
        return this.groupRepo.forList(listId);
    }

    remove(id: number | string) {
        return this.groupRepo.remove(id);
    }
}

export default ManageGroups;
