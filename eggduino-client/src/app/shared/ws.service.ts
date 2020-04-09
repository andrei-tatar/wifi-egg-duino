import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class WebSocketService {
    private readonly ws$ = new Observable<WebSocket>(observer => {
        const uri = `ws://${location.host}/api/ws`;
        const ws = new WebSocket(uri);
        ws.onopen = () => observer.next(ws);
        ws.onclose = () => observer.complete();
        ws.onerror = err => observer.error(err);
        return () => ws.close();
    });

    readonly messages$ = this.ws$.pipe(
        switchMap(ws => new Observable(observer => {
            ws.onmessage = event => observer.next(event.data);
        }))
    );
}

new WebSocketService().messages$.subscribe(m => console.log(m));
