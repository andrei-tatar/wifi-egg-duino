import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
    ignoreElements, switchMap, scan, catchError,
    shareReplay, distinctUntilChanged, skip, map, debounce
} from 'rxjs/operators';
import { Subject, concat, defer, EMPTY, of, merge, timer } from 'rxjs';
import { propsEqual, cache } from '../utils';
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
        shareReplay(1),
    );

    readonly motionParams$ = this.client.get<MotionParams>('api/motion');

    constructor(
        private client: HttpClient
    ) {
    }

    uploadFile(name: string, content: string) {
        const params: FormData = new FormData();
        params.append('data', new Blob([content], { type: 'text/plain' }), name);
        return concat(
            this.client.post('api/file', params),
            defer(() => {
                this.events$.next({ type: 'create', name });
            }),
        ).pipe(ignoreElements());
    }

    loadFile(name: string) {
        return this.client.get('api/file/' + name, {
            responseType: 'text'
        }).pipe(
            cache(`file:${name}`),
        );
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

    printFile(name: string) {
        return this.client.post('api/print/' + name, '', { responseType: 'text' });
    }


    updateConfig(config: Config) {
        this.updateConfig$.next(config);
    }

    sendCommand(cmd: MotionCommand) {
        return this.client.post(
            'api/command',
            `command=${cmd}`,
            {
                headers: new HttpHeaders().append('Content-Type', 'application/x-www-form-urlencoded'),
            }
        ).pipe(ignoreElements());
    }

    updateMotionParams(params: MotionParams) {
        const url = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            url.append(key, `${value}`);
        }
        return this.client.patch('api/motion', url.toString(), {
            responseType: 'text',
            headers: new HttpHeaders().append('Content-Type', 'application/x-www-form-urlencoded'),
        }).pipe(ignoreElements());
    }
}

export type MotionCommand = 'pen-up' | 'pen-down' | 'motors-enable' | 'motors-disable' |
    'print-pause' | 'print-stop' | 'print-continue';

export interface PrintFile {
    name: string;
}

export interface MotionParams {
    penUpPercent: number;
    penDownPercent: number;
    drawingSpeed: number;
    penMoveDelay: number;
    travelSpeed: number;
    stepsPerRotation: number;
    reversePen: boolean;
    reverseRotation: boolean;
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
