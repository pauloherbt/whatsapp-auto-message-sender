'use strict';

class Group {
    constructor({ id, listId, wppGroupId, name, addedAt }) {
        this.id = id;
        this.listId = listId;
        this.wppGroupId = wppGroupId;
        this.name = name || wppGroupId;
        this.addedAt = addedAt || new Date().toISOString();
    }
}

module.exports = Group;
