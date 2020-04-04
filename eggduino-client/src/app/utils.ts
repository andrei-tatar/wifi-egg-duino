export const WIDTH = 3200;
export const HEIGHT = 800;
export const HOME: Point = { x: 0, y: HEIGHT / 2 };

export const DEFAULT_LAYER_COLORS = [
    'darkred', 'darkblue', 'darkgreen', 'darkyellow', 'darkorange',
    'cyan', 'magenta', 'red', 'blue', 'green', 'yellow', 'orange', 'indigo', 'teal',
    'olive', 'brown', 'lightcoral', 'darkseagreen', 'deepskyblue', 'purple',
];

export interface Point {
    x: number;
    y: number;
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
