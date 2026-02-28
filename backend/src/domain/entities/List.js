'use strict';

class List {
    constructor({ id, name, createdAt }) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt || new Date().toISOString();
    }

    validate() {
        if (!this.name || this.name.trim().length === 0) {
            throw new Error('O nome da lista não pode ser vazio.');
        }
    }
}

module.exports = List;
