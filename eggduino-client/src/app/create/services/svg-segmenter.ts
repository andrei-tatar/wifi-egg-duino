import { Injectable } from '@angular/core';
import { PathSegmenter } from './path-segmenter';
import { Segment, Point, Layer } from 'src/app/utils';

// TODO: remove dependency from DOMParser so it can work in a web worker

@Injectable()
export class SvgSegmenter {

    constructor(
        private pathSegmenter: PathSegmenter,
    ) {
    }

    async segment(blob: Blob, resolveLayer: LayerResolveType): Promise<Layer[]> {
        const svg = await this.loadSvg(blob);
        let resolver: LayerIdResolver;
        switch (resolveLayer) {
            case 'color':
                resolver = e => e.style.stroke || null;
                break;
            case 'inkscape':
                resolver = e => e.attributes.getNamedItem('inkscape:groupmode')?.value === 'layer'
                    ? e.attributes.getNamedItem('inkscape:label').value
                    : null;
                break;
            case 'none':
                resolver = _ => null;
                break;
            default:
                throw new Error(`Layer resolver not supported ${resolveLayer}`);
        }

        const layers = new Map<string, Segment[]>();
        this.traverseSvg(svg, svg, [], resolver, layers);
        return Array.from(layers, ([id, segments]) => {
            const layer: Layer = {
                id,
                description: id ?? '<No description>',
                segments,
            };
            return layer;
        });
    }

    private async loadSvg(blob: Blob): Promise<SVGSVGElement> {
        const svgText = await this.blobToText(blob);
        const parser = new DOMParser();
        const parsed = parser.parseFromString(svgText, 'image/svg+xml');
        if (!(parsed.documentElement instanceof SVGSVGElement)) {
            throw new Error('invalid SVG doc');
        }
        return parsed.documentElement;
    }

    private blobToText(blob: Blob): Promise<string> {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result as string);
            reader.readAsText(blob);
        });
    }

    private traverseSvg(
        doc: SVGSVGElement,
        root: SVGElement,
        transforms: DOMMatrix[],
        layerIdResolver: LayerIdResolver,
        layers: Map<string, Segment[]>,
        layerId = null,
    ) {
        for (const child of this.getEntries(root.children)) {
            if (!(child instanceof SVGElement) || child instanceof SVGDefsElement) { continue; }

            let pushedTransform = false;
            if (child instanceof SVGGraphicsElement && child.transform.baseVal.numberOfItems) {
                const transform = child.transform.baseVal.consolidate();
                transforms.push(transform.matrix);
                pushedTransform = true;
            }

            const transformMatrix = transforms.reduce((prev, current) => prev.multiply(current), doc.createSVGMatrix());

            const layerIdToUse = layerIdResolver(child) ?? layerId;

            const segmentPath = (pathData: string) => {
                const pathSegments = this.pathSegmenter.segment(pathData);
                this.applyMatrixTransformation(doc, pathSegments, transformMatrix);
                const layerSegments = layers.get(layerIdToUse);
                if (!layerSegments) {
                    layers.set(layerIdToUse, pathSegments);
                } else {
                    layerSegments.push(...pathSegments);
                }
            };

            if (child.children.length) {
                this.traverseSvg(doc, child, transforms, layerIdResolver, layers, layerIdToUse);
            } else if (child instanceof SVGPathElement) {
                const data = child.attributes.getNamedItem('d').value;
                segmentPath(data);
            } else if (child instanceof SVGCircleElement || child instanceof SVGEllipseElement) {
                const rx = 'rx' in child ? child.rx.baseVal.value : child.r.baseVal.value;
                const ry = 'ry' in child ? child.ry.baseVal.value : child.r.baseVal.value;
                const cx = child.cx.baseVal.value;
                const cy = child.cy.baseVal.value;
                const x1 = cx - rx;
                const x2 = cx + rx;
                segmentPath(`M ${x1},${cy} A ${rx},${ry} 0 1 0 ${x2},${cy}, A ${rx},${ry} 0 1 0 ${x1},${cy}`);
            } else if (child instanceof SVGRectElement) {
                const x = child.x.baseVal.value;
                const y = child.y.baseVal.value;
                const w = child.width.baseVal.value;
                const h = child.height.baseVal.value;
                segmentPath(`M ${x},${y} h ${w} v ${h} h ${-w} z`);
            } else if (child instanceof SVGLineElement) {
                const x1 = child.x1.baseVal.value;
                const y1 = child.y1.baseVal.value;
                const x2 = child.x2.baseVal.value;
                const y2 = child.y2.baseVal.value;
                segmentPath(`M ${x1},${y1} ${x2},${y2}`);
            } else if (child instanceof SVGPolylineElement || child instanceof SVGPolygonElement) {
                const points: Point[] = [];
                for (let i = 0; i < child.points.numberOfItems; i++) {
                    const p = child.points.getItem(i);
                    points.push({
                        x: p.x,
                        y: p.y,
                    });
                }
                segmentPath(`M ${points.map(({ x, y }) => `${x},${y}`).join(' ')}${child instanceof SVGPolygonElement ? 'Z' : ''}`);
            }

            if (pushedTransform) {
                transforms.pop();
            }
        }
    }

    private applyMatrixTransformation(doc: SVGSVGElement, segments: Segment[], matrix: DOMMatrix) {
        for (const segment of segments) {
            for (const point of segment.points) {
                const svgPoint = doc.createSVGPoint();
                svgPoint.x = point.x;
                svgPoint.y = point.y;
                const { x, y } = svgPoint.matrixTransform(matrix);
                point.x = x;
                point.y = y;
            }
        }
    }

    private * getEntries(collection: HTMLCollection) {
        for (let i = 0; i < collection.length; i++) {
            yield collection.item(i);
        }
    }
}

export type LayerResolveType = 'color' | 'inkscape' | 'none';

type LayerIdResolver = (e: SVGElement) => string | null;
