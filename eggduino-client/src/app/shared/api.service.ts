import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ignoreElements, switchMap, map, publishReplay, refCount, scan } from 'rxjs/operators';
import { Subject, concat, defer, EMPTY, of } from 'rxjs';

@Injectable()
export class ApiService {

    private events$ = new Subject<
        { type: 'delete', name: string } |
        { type: 'create', name: string }
    >();

    readonly files$ = this.client.get<PrintFile[]>('api/files').pipe(
        switchMap(files => concat(
            of(files),
            this.events$.pipe(
                scan((ctx, event) => {
                    switch (event.type) {
                        case 'delete':
                            return ctx.filter(f => f.name !== event.name);
                        case 'create':
                            return [...ctx, { name: event.name }];
                        default:
                            throw new Error(`unsupported event`);
                    }
                }, files)
            ))
        ),
        publishReplay(1),
        refCount(),
    );

    constructor(
        private client: HttpClient
    ) {
    }

    uploadFile(name: string, content: string) {
        const formData: FormData = new FormData();
        formData.append('data', new Blob([content], { type: 'text/plain' }), name);
        return concat(
            this.client.post('api/file', formData),
            defer(() => {
                this.events$.next({ type: 'create', name });
            }),
        ).pipe(ignoreElements());
    }

    loadFile(name: string) {
        return this.client.get('api/file/' + name, {
            responseType: 'text'
        });
    }

    deleteFile(name: string) {
        return concat(
            this.client.delete('api/file/' + name, {
                responseType: 'text',
            }),
            defer(() => {
                this.events$.next({ type: 'delete', name });
                return EMPTY;
            }),
        ).pipe(ignoreElements());
    }
}

export interface PrintFile {
    name: string;
}
