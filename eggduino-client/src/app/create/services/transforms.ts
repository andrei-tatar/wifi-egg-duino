import { Injectable } from '@angular/core';
import { Layer, STEPS_PER_REV, Point, Segment, HOME, distanceBetweenPoints } from 'src/app/utils';

@Injectable()
export class TransformsService {

    scaleLayers(layers: Layer[], hScale: number, vScale: number, vOffset: number, aroundCenter = true) {
        for (const layer of layers) {
            for (const segment of layer.segments) {
                for (const point of segment.points) {
                    if (aroundCenter) {
                        point.x = (point.x - STEPS_PER_REV / 2) * hScale + STEPS_PER_REV / 2;
                    } else {
                        point.x *= hScale;
                    }
                    point.y = point.y * vScale + vOffset;
                }
            }
        }
    }

    optimizeTravel(layers: Layer[], reverseSegments: boolean) {
        let targetPoint: Point = null;

        for (const layer of layers) {
            const toSort = layer.segments;
            const sorted: Segment[] = [];

            while (toSort.length) {
                if (sorted.length) {
                    const lastSegment = sorted[sorted.length - 1];
                    targetPoint = lastSegment.points[lastSegment.points.length - 1];
                } else {
                    targetPoint = targetPoint ?? HOME;
                }

                let minDistance: number = null;
                let nextSegmentIndex: number;
                let reverse = false;
                for (const [index, segment] of toSort.entries()) {
                    const startPoint = segment.points[0];

                    const startToTarget = distanceBetweenPoints(startPoint, targetPoint);
                    if (minDistance === null || startToTarget < minDistance) {
                        minDistance = startToTarget;
                        nextSegmentIndex = index;
                        reverse = false;
                    }

                    if (reverseSegments) {
                        const endPoint = segment.points[segment.points.length - 1];
                        const endToTarget = distanceBetweenPoints(endPoint, targetPoint);
                        if (endToTarget < minDistance) {
                            minDistance = endToTarget;
                            nextSegmentIndex = index;
                            reverse = true;
                        }
                    }
                }

                const [closestSegment] = toSort.splice(nextSegmentIndex, 1);
                if (reverse) { closestSegment.points.reverse(); }
                sorted.push(closestSegment);
            }

            layer.segments = sorted;
        }
    }

    simplifySegments(layers: Layer[], threshold: number) {
        for (const layer of layers) {
            for (const segment of layer.segments) {
                let start = 0;
                while (start < segment.points.length - 2) {
                    const l1 = segment.points[start];
                    const p = segment.points[start + 1];
                    const l2 = segment.points[start + 2];

                    const distance = this.distanceFromPointToLine(l1, l2, p);
                    if (distance < threshold) {
                        segment.points.splice(start + 1, 1);
                    } else {
                        start++;
                    }
                }
            }
        }
    }

    roundPoints(layers: Layer[]) {
        for (const layer of layers) {
            for (const segment of layer.segments) {
                for (const point of segment.points) {
                    point.x = Math.round(point.x);
                    point.y = Math.round(point.y);
                }
            }
        }
    }

    mergeConsecutiveSegments(layers: Layer[]) {
        for (const layer of layers) {
            let start = 0;
            while (start < layer.segments.length - 1) {
                const current = layer.segments[start];
                const currentEnd = current.points[current.points.length - 1];

                const next = layer.segments[start + 1];
                const nextStart = next.points[0];

                const distance = distanceBetweenPoints(currentEnd, nextStart);
                if (distance < 2) {
                    current.points.push(...next.points.slice(1));
                    layer.segments.splice(start + 1, 1);
                } else {
                    start++;
                }
            }
        }
    }

    getImprovements(oldLayers: Layer[], newLayers: Layer[]) {
        const oldStats = this.getStats(oldLayers);
        const newStats = this.getStats(newLayers);
        return {
            points: (newStats.points - oldStats.points) / oldStats.points,
            travel: (newStats.travel - oldStats.travel) / oldStats.travel,
            segments: (newStats.segments - oldStats.segments) / oldStats.segments,
        };
    }

    private getStats(layers: Layer[]) {
        let points = 0;
        let travel = 0;
        let lastPoint: Point = HOME;
        let segments = 0;

        for (const layer of layers) {
            segments += layer.segments.length;
            for (const segment of layer.segments) {
                points += segment.points.length;
                travel += distanceBetweenPoints(segment.points[0], lastPoint);
                lastPoint = segment.points[segment.points.length - 1];
            }
        }

        return { points, travel, segments };
    }

    private distanceFromPointToLine(l1: Point, l2: Point, point: Point) {
        const p1 = Math.abs(point.x * (l2.y - l1.y) - point.y * (l2.x - l1.x) + l2.x * l1.y - l2.y * l1.x);
        const p2 = Math.sqrt(Math.pow(l2.y - l1.y, 2) + Math.pow(l2.x - l1.x, 2));
        return p1 / p2;
    }
}
