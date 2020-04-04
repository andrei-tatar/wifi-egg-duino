import { Layer } from 'src/app/utils';
import { Injectable } from '@angular/core';

@Injectable()
export class CodeConverter {

    layersToCode(layers: Layer[]) {
        const instructions: string[] = [Commands.MotorEnable, Commands.PenUp, Commands.Home];

        for (const layer of layers) {
            if (layers.length > 1) {
                instructions.push(`${Commands.SwitchPen} ${layer.description}`);
            }

            for (const segment of layer.segments) {
                instructions.push(Commands.PenDown);
                for (const point of segment.points) {
                    instructions.push(`${Commands.Move} ${point.x} ${point.y}`);
                }
                instructions.push(Commands.PenUp);
            }
        }

        instructions.push(Commands.Home, Commands.MotorDisable);

        return instructions.join('\n');
    }

    codeToLayers(code: string): Layer[] {
        const layers: Layer[] = [];
        const instructions = code.split('\n');
        let layer: Layer = null;

        for (const instruction of instructions) {
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
                        points: [],
                    });
                    break;
                case Commands.Move:
                    const segments = layer?.segments;
                    if (segments) {
                        const lastSegment = segments[segments.length - 1];
                        lastSegment.points.push({
                            x: parseInt(args[0], 10),
                            y: parseInt(args[1], 10),
                        });
                    }
                    break;
                case Commands.PenUp:
                    break;
            }
        }

        if (layer) {
            layers.push(layer);
        }

        return layers;
    }
}

enum Commands {
    PenUp = 'P0',
    PenDown = 'P1',
    Move = 'M',
    SwitchPen = 'S',
    Home = 'H',
    MotorEnable = 'M1',
    MotorDisable = 'M0',
}
