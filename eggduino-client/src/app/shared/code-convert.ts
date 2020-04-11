import { Layer, Point, distanceBetweenPoints } from 'src/app/utils';
import { Injectable } from '@angular/core';

@Injectable()
export class CodeConverter {


    layersToCode(layers: Layer[]) {
        const instructions: string[] = [Commands.MotorEnable, Commands.PenUp, Commands.Home];

        let totalTravel = 0;
        let last: Point = { x: 0, y: 0 };
        for (const layer of layers) {
            for (const segment of layer.segments) {
                for (const point of segment.points) {
                    totalTravel += distanceBetweenPoints(last, point);
                    last = point;
                }
            }
        }

        const reportProgress = function _(this: { lastProgress?: number, last: Point, travel: number }, point: Point) {
            this.travel += distanceBetweenPoints(this.last, point);
            this.last = point;
            const progress = Math.round(this.travel / totalTravel * 100);
            if (progress !== this.lastProgress) {
                instructions.push(`${Commands.Progress} ${progress}`);
                this.lastProgress = progress;
            }
        }.bind({ last: { x: 0, y: 0 }, travel: 0 });

        for (const layer of layers) {
            if (layers.length > 1) {
                instructions.push(`${Commands.SwitchPen} ${layer.description}`);
            }

            for (const segment of layer.segments) {
                const firstPoint = segment.points[0];
                instructions.push(`${Commands.Move} ${this.roundToDecimals(firstPoint.x)} ${this.roundToDecimals(firstPoint.y)}`);
                instructions.push(Commands.PenDown);
                reportProgress(firstPoint);
                for (const point of segment.points.slice(1)) {
                    instructions.push(`${Commands.Move} ${this.roundToDecimals(point.x)} ${this.roundToDecimals(point.y)}`);
                    reportProgress(point);
                }
                instructions.push(Commands.PenUp);
            }
        }

        instructions.push(Commands.Home, Commands.MotorDisable);

        return instructions.map(i => i.substr(0, 29)).join('\n');
    }

    codeToLayers(code: string): Layer[] {
        const layers: Layer[] = [];
        const instructions = code.split('\n');
        let layer: Layer = null;
        let start: Point;
        let penDown = false;

        for (const [index, instruction] of instructions.entries()) {
            const [command, ...args] = instruction.split(' ');

            switch (command) {
                case Commands.SwitchPen:
                    const description = args.join(' ');
                    if (layer) {
                        layers.push(layer);
                    }
                    layer = {
                        id: description,
                        description,
                        segments: [],
                    };
                    break;
                case Commands.PenDown:
                    if (!layer) {
                        layer = {
                            id: null,
                            description: 'no name',
                            segments: [],
                        };
                    }

                    layer.segments.push({
                        points: [start],
                    });
                    penDown = true;
                    break;
                case Commands.Move:
                    const segments = layer?.segments;
                    const p: Point = {
                        x: parseFloat(args[0]),
                        y: parseFloat(args[1]),
                        srcLineNumber: index,
                    };
                    if (penDown) {
                        const lastSegment = segments[segments.length - 1];
                        lastSegment.points.push(p);
                    } else {
                        start = p;
                    }
                    break;
                case Commands.PenUp:
                    penDown = false;
                    break;
            }
        }

        if (layer) {
            layers.push(layer);
        }

        return layers;
    }

    private roundToDecimals(n: number, decimals = 2) {
        const power = Math.pow(10, decimals);
        return Math.round(n * power) / power;
    }
}

enum Commands {
    PenUp = 'P0',
    PenDown = 'P1',
    Move = 'T',
    SwitchPen = 'S',
    Home = 'H',
    Progress = 'Z',
    MotorEnable = 'M1',
    MotorDisable = 'M0',
}
