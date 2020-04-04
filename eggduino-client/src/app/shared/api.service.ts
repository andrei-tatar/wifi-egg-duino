import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
    ignoreElements, switchMap, publishReplay, refCount, scan, catchError,
    shareReplay, distinctUntilChanged, skip, map, debounce
} from 'rxjs/operators';
import { Subject, concat, defer, EMPTY, of, merge, timer } from 'rxjs';
import { propsEqual } from '../utils';
import { LayerResolveType } from '../create/services/svg-segmenter';

const DEFAULT_CONFIG: Config = {
    hScale: 1,
    vScale: 1,
    vOffset: 0,
    optimizeTravel: true,
    reverseSegments: true,
    simplifySegments: true,
    simplifyThreshold: .6,
    layerResolveType: 'none',
};

@Injectable()
export class ApiService {
    private updateConfig$ = new Subject<Config>();
    private events$ = new Subject<
        { type: 'delete', name: string } |
        { type: 'create', name: string }
    >();

    private configInternal = concat(
        this.client.get<Config>('api/config').pipe(catchError(_ => of(DEFAULT_CONFIG))),
        this.updateConfig$,
    ).pipe(shareReplay(1));

    private saveConfig$ = this.configInternal.pipe(
        map((value, index) => ({ value, index })),
        debounce(({ index }) => index === 0 ? EMPTY : timer(5000)),
        map(({ value }) => value),
        distinctUntilChanged((a, b) => propsEqual(a, b)),
        skip(1),
        switchMap(config => this.client.post('api/config', config)),
        ignoreElements(),
    );

    readonly config$ = merge(this.configInternal, this.saveConfig$).pipe(shareReplay(1));

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

    updateConfig(config: Config) {
        this.updateConfig$.next(config);
    }
}

export interface PrintFile {
    name: string;
}

export interface Config {
    hScale: number;
    vScale: number;
    vOffset: number;
    simplifySegments: boolean;
    optimizeTravel: boolean;
    reverseSegments: boolean;
    simplifyThreshold: number;
    layerResolveType: LayerResolveType;
}
