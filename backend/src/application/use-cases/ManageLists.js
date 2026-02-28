'use strict';

class ManageLists {
    constructor(listRepo) {
        this.repositories = { lists: listRepo };
    }

    create(name) {
        const existing = this.repositories.lists.getByName(name);
        if (existing) throw new Error(`Lista "${name}" já existe.`);
        return this.repositories.lists.create(name);
    }

    getAll() {
        return this.repositories.lists.getAll();
    }

    getById(id) {
        return this.repositories.lists.getById(id);
    }

    rename(id, newName) {
        const existing = this.repositories.lists.getById(id);
        if (!existing) throw new Error(`Lista ID ${id} não encontrada para edição.`);

        const existingName = this.repositories.lists.getByName(newName);
        if (existingName && existingName.id !== id) throw new Error(`Já existe outra lista chamada "${newName}".`);

        return this.repositories.lists.update(id, newName);
    }

    remove(id) {
        const existing = this.repositories.lists.getById(id);
        if (!existing) throw new Error(`Lista ID ${id} não encontrada para exclusão.`);
        return this.repositories.lists.delete(id);
    }
}

module.exports = ManageLists;
