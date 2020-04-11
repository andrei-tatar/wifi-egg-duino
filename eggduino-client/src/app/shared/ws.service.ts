import { Injectable } from '@angular/core';
import { Observable, interval, merge, race } from 'rxjs';
import { switchMap, retryWhen, delay, scan, shareReplay, debounceTime, tap, ignoreElements, filter, timeout, map, refCount, publish } from 'rxjs/operators';
import { PresentationService } from './presentation.service';

@Injectable()
export class WebSocketService {
    private readonly ws$ = race(new Observable<WebSocket>(observer => {
        const uri = `ws://${location.host}/api/ws`;
        const ws = new WebSocket(uri);
        ws.onopen = () => observer.next(ws);
        ws.onclose = () => observer.complete();
        ws.onerror = err => observer.error(err);
        return () => ws.close();
    }), this.presentationService.globalLoader);

    readonly messages$ = this.ws$.pipe(
        switchMap(ws => {
            const msgs$ = new Observable<any>(observer => {
                ws.onmessage = event => observer.next(event.data);
            }).pipe(
                publish(),
                refCount(),
            );
            const ping$ = interval(1500).pipe(tap(_ => ws.send('__ping__')), ignoreElements());
            const pong$ = msgs$.pipe(
                filter(m => m === '__pong__'),
                timeout(2000),
                ignoreElements(),
            );
            return merge(msgs$, ping$, pong$).pipe(
                filter(m => m !== '__pong__'),
                map(msg => {
                    try {
                        const parsed: WsMessage = JSON.parse(msg);
                        return parsed;
                    } catch (err) {
                        console.warn('unable to parse ws message', err);
                        return null;
                    }
                }),
                filter(msg => msg != null),
            );
        }),
        retryWhen(err$ => err$.pipe(
            tap(err => console.warn('ws error; reconnecting', err)),
        )),
    );

    readonly status$ = this.messages$.pipe(
        scan((ctx, msg) => {
            ctx = { ...ctx, ...msg };
            return ctx;
        }, {
            progress: 0,
            status: 'stopped',
            fileName: null,
            waitingFor: '',
        } as {
            progress: number;
            fileName: string;
            waitingFor: string;
            status: 'paused' | 'printing' | 'stopped';
        }),
        debounceTime(0),
        shareReplay(1),
    );

    constructor(
        private presentationService: PresentationService,
    ) {
    }
}

type WsMessage = Partial<{
    status: 'stopped' | 'printing' | 'paused';
    fileName?: string;
    progress: number;
    waitingFor?: string;

}>;
