import { Layer } from 'src/app/utils';
import { Injectable } from '@angular/core';

@Injectable()
export class CodeConverter {

    convertToCode(layers: Layer[]) {
        const instructions: string[] = [];

        for (const layer of layers) {
            instructions.push('P0');
            for (const segment of layer.segments) {
                for (const point of segment.points) {
                    instructions.push(`G ${point.x} ${point.y}`);
                }
            }
            instructions.push('P1');
        }

        return instructions.join('\n');
    }
}
