import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class ApiService {
    constructor(
        private client: HttpClient
    ) {
    }

    getFiles() {
        return this.client.get<PrintFile[]>('api/files');
    }

    uploadFile(name: string, content: string) {
        const formData: FormData = new FormData();
        formData.append('data', new Blob([content], { type: 'text/plain' }), name);
        return this.client.post('api/file', formData);
    }

    loadFile(name: string) {
        return this.client.get<string>('api/file/' + name);
    }

    deleteFile(name: string) {
        return this.client.delete<string>('api/files/' + name);
    }
}

export interface PrintFile {
    name: string;
}
