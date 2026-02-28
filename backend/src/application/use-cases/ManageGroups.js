'use strict';

class ManageGroups {
    constructor(groupRepo, listRepo) {
        this.groupRepo = groupRepo;
        this.listRepo = listRepo;
    }

    add(listId, wppGroupId, name = '') {
        const list = this.listRepo.getById(listId);
        if (!list) throw new Error(`Lista ID ${listId} não encontrada.`);
        return this.groupRepo.add(listId, wppGroupId, name);
    }

    forList(listId) {
        return this.groupRepo.forList(listId);
    }

    remove(id) {
        return this.groupRepo.remove(id);
    }
}

module.exports = ManageGroups;
