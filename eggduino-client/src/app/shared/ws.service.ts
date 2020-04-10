import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap, retryWhen, delay, scan, shareReplay } from 'rxjs/operators';

@Injectable()
export class WebSocketService {
    private readonly ws$ = new Observable<WebSocket>(observer => {
        const uri = `ws://${location.host}/api/ws`;
        const ws = new WebSocket(uri);
        ws.onopen = () => observer.next(ws);
        ws.onclose = () => observer.complete();
        ws.onerror = err => observer.error(err);
        return () => ws.close();
    }).pipe(
        retryWhen(err => err.pipe(delay(1000))),
    );

    readonly messages$ = this.ws$.pipe(
        switchMap(ws => new Observable<WsMessage>(observer => {
            ws.onmessage = event => {
                try {
                    const parsed: WsMessage = JSON.parse(event.data);
                    observer.next(parsed);
                } catch (err) {
                    console.warn('unable to parse ws message', err);
                }
            };
        }))
    );

    readonly status$ = this.messages$.pipe(
        scan((ctx, msg) => {
            ctx = { ...ctx, ...msg };
            console.log(ctx);
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
        shareReplay(1),
    );
}

type WsMessage = Partial<{
    status: 'stopped' | 'printing' | 'paused';
    fileName?: string;
    progress: number;
    waitingFor?: string;

}>;
