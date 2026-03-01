export interface GroupProps {
    id: string;
    listId: string;
    wppGroupId: string;
    name?: string;
    addedAt?: string;
}

export default class Group {
    id: string;
    listId: string;
    wppGroupId: string;
    name: string;
    addedAt: string;

    constructor({ id, listId, wppGroupId, name, addedAt }: GroupProps) {
        this.id = id;
        this.listId = listId;
        this.wppGroupId = wppGroupId;
        this.name = name || wppGroupId;
        this.addedAt = addedAt || new Date().toISOString();
    }
}
