export interface ListProps {
    id: string;
    name: string;
    createdAt?: string;
}

export default class List {
    id: string;
    name: string;
    createdAt: string;

    constructor({ id, name, createdAt }: ListProps) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt || new Date().toISOString();
    }

    validate(): void {
        if (!this.name || this.name.trim().length === 0) {
            throw new Error('O nome da lista não pode ser vazio.');
        }
    }
}
