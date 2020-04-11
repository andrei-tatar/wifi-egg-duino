import { MonoTypeOperatorFunction, Observable } from 'rxjs';
import { tap, finalize, publishReplay, refCount } from 'rxjs/operators';

export const STEPS_PER_REV = 360; // all coordinates are in degrees
export const HOME: Point = { x: 0, y: 0 };

export const DEFAULT_LAYER_COLORS = [
    'darkred', 'darkblue', 'darkgreen', 'darkyellow', 'darkorange',
    'cyan', 'magenta', 'red', 'blue', 'green', 'yellow', 'orange', 'indigo', 'teal',
    'olive', 'brown', 'lightcoral', 'darkseagreen', 'deepskyblue', 'purple',
];

export interface Point {
    x: number;
    y: number;
    srcLineNumber?: number;
}

export interface Segment {
    points: Point[];
}

export interface Layer {
    id: string;
    description: string;
    segments: Segment[];
}

export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function* allMatches(input: string, regexp: RegExp) {
    let match: RegExpExecArray;
    do {
        match = regexp.exec(input);
        if (match) { yield match; }
    } while (match);
}

export function removeExtension(fileName: string) {
    const parts = fileName.split('.');
    return parts.slice(0, parts.length - 1).join('.');
}

export function blobToText(blob: Blob): Promise<string> {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result as string);
        reader.readAsText(blob);
    });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result as string);
        reader.readAsDataURL(blob);
    });
}

export function propsEqual<T>(a: T, b: T) {
    return Object.keys(a).length === Object.keys(b).length &&
        Object.entries(a).every(([key, value]) => b[key] === value);
}

export function distanceBetweenPoints(p1: Point, p2: Point) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

const cacheTemp = new Map<string, Observable<string>>();

export function cache(key: string, storage: Storage = sessionStorage): MonoTypeOperatorFunction<string> {
    return source => new Observable<string>(observer => {
        const cached = cacheTemp.get(key);
        if (cached) {
            return cached.subscribe(observer);
        }

        const value = storage.getItem(key);
        if (value != null) {
            observer.next(value);
            observer.complete();
        } else {
            const add = source.pipe(
                publishReplay(1),
                refCount(),
                tap(v => {
                    storage.setItem(key, v);
                }),
                finalize(() => {
                    cacheTemp.delete(key);
                })
            );
            cacheTemp.set(key, add);
            return add.subscribe(observer);
        }
    });
}
