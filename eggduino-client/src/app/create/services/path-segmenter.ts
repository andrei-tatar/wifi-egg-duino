// help from: https://github.com/tmpvar/gcode-simulator/blob/master/js/SVGReader.js

import { Injectable } from '@angular/core';
import { Point, Segment, allMatches } from 'src/app/utils';

const tolerance2 = 0.01;

@Injectable()
export class PathSegmenter {
    segment(pathData: string): Segment[] {
        const segments: Segment[] = [];

        const appendCurrentSegment = () => {
            if (segment.points.length) {
                segments.push(segment);
                segment = { points: [] };
            }
        };

        let segment: Segment = { points: [] };
        let last: Point = { x: 0, y: 0 };
        let start: Point | null;
        let prevCp: Point;

        for (const [_, op, args] of allMatches(pathData, /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi)) {
            switch (op) {
                case 'M': {
                    appendCurrentSegment();
                    const points = this.parsePoints(args);
                    segment.points.push(...points);
                    start = points[0];
                    last = segment.points[segment.points.length - 1];
                    break;
                }
                case 'm': {
                    appendCurrentSegment();
                    const points = this.parsePoints(args);
                    start = null;
                    for (const p of points) {
                        const point = {
                            x: last.x + p.x,
                            y: last.y + p.y,
                        };
                        if (!start) {
                            start = point;
                        }
                        segment.points.push(point);
                        last = point;
                    }
                    break;
                }
                case 'l': {
                    const points = this.parsePoints(args);
                    for (const p of points) {
                        const point = {
                            x: last.x + p.x,
                            y: last.y + p.y,
                        };
                        segment.points.push(point);
                        last = point;
                    }
                    break;
                }
                case 'L': {
                    const points = this.parsePoints(args);
                    segment.points.push(...points);
                    last = segment.points[segment.points.length - 1];
                    break;
                }
                case 'v': {
                    const distances = this.parseNumbers(args);
                    for (const d of distances) {
                        const point = {
                            x: last.x,
                            y: last.y + d,
                        };
                        segment.points.push(point);
                        last = point;
                    }
                    break;
                }
                case 'V': {
                    const distances = this.parseNumbers(args);
                    for (const d of distances) {
                        const point = {
                            x: last.x,
                            y: d,
                        };
                        segment.points.push(point);
                        last = point;
                    }
                    break;
                }
                case 'h': {
                    const distances = this.parseNumbers(args);
                    for (const d of distances) {
                        const point = {
                            x: last.x + d,
                            y: last.y,
                        };
                        segment.points.push(point);
                        last = point;
                    }
                    break;
                }
                case 'H': {
                    const distances = this.parseNumbers(args);
                    for (const d of distances) {
                        const point = {
                            x: d,
                            y: last.y,
                        };
                        segment.points.push(point);
                        last = point;
                    }
                    break;
                }
                case 'z':
                case 'Z':
                    if (start) {
                        segment.points.push({ ...start });
                        last = start;
                    }
                    break;
                case 'C':  // curveto cubic absolute
                    {
                        const points = this.parsePoints(args);
                        for (let i = 0; i < points.length; i += 3) {
                            const p2 = points[i];
                            const p3 = points[i + 1];
                            const p4 = points[i + 2];
                            this.addCubicBezier(segment, last, p2, p3, p4, 0, tolerance2);
                            last = p4;
                            segment.points.push(p4);
                            prevCp = p3;
                        }
                        break;
                    }
                case 'S':  // curveto cubic absolute shorthand
                    {
                        const points = this.parsePoints(args);
                        for (let i = 0; i < points.length; i += 2) {
                            const p2 = { x: 2 * last.x - prevCp.x, y: 2 * last.y - prevCp.y };
                            const p3 = points[i];
                            const p4 = points[i + 1];
                            this.addCubicBezier(segment, last, p2, p3, p4, 0, tolerance2);
                            last = p4;
                            segment.points.push(p4);
                            prevCp = p3;
                        }
                        break;
                    }
                case 'c':  // curveto cubic relative
                    {
                        const points = this.parsePoints(args);
                        for (let i = 0; i < points.length; i += 3) {
                            const p2 = { x: last.x + points[i].x, y: last.y + points[i].y };
                            const p3 = { x: last.x + points[i + 1].x, y: last.y + points[i + 1].y };
                            const p4 = { x: last.x + points[i + 2].x, y: last.y + points[i + 2].y };
                            this.addCubicBezier(segment, last, p2, p3, p4, 0, tolerance2);
                            last = p4;
                            segment.points.push(p4);
                            prevCp = p3;
                        }
                        break;
                    }
                case 's':  // curveto cubic relative shorthand
                    {
                        const points = this.parsePoints(args);
                        for (let i = 0; i < points.length; i += 2) {
                            const p2 = { x: 2 * last.x - prevCp.x, y: 2 * last.y - prevCp.y };
                            const p3 = { x: last.x + points[i].x, y: last.y + points[i].y };
                            const p4 = { x: last.x + points[i + 1].x, y: last.y + points[i + 1].y };
                            this.addCubicBezier(segment, last, p2, p3, p4, 0, tolerance2);
                            last = p4;
                            segment.points.push(p4);
                            prevCp = p3;
                        }
                        break;
                    }
                case 'Q':  // curveto quadratic absolute
                    {
                        const points = this.parsePoints(args);
                        for (let i = 0; i < points.length; i += 2) {
                            const p2 = points[i];
                            const p3 = points[i + 1];
                            this.addQuadraticBezier(segment, last, p2, p3, 0, tolerance2);
                            segment.points.push(p3);
                            last = p3;
                            prevCp = p2;
                        }
                        break;
                    }
                case 'T':  // curveto quadratic absolute shorthand
                    {
                        const points = this.parsePoints(args);
                        for (const p3 of points) {
                            const p2 = { x: 2 * last.x - prevCp.x, y: 2 * last.y - prevCp.y };
                            this.addQuadraticBezier(segment, last, p2, p3, 0, tolerance2);
                            segment.points.push(p3);
                            last = p3;
                            prevCp = p2;
                        }
                        break;
                    }
                case 'q':  // curveto quadratic relative
                    {
                        const points = this.parsePoints(args);
                        for (let i = 0; i < points.length; i += 2) {
                            const p2 = { x: last.x + points[i].x, y: last.y + points[i].y };
                            const p3 = { x: last.x + points[i + 1].x, y: last.y + points[i + 1].y };
                            this.addQuadraticBezier(segment, last, p2, p3, 0, tolerance2);
                            segment.points.push(p3);
                            last = p3;
                            prevCp = p2;
                        }
                        break;
                    }
                case 't':  // curveto quadratic relative shorthand
                    {
                        const points = this.parsePoints(args);
                        for (const { x, y } of points) {
                            const p2 = { x: 2 * last.x - prevCp.x, y: 2 * last.y - prevCp.y };
                            const p3 = { x: last.x + x, y: last.y + y };
                            this.addQuadraticBezier(segment, last, p2, p3, 0, tolerance2);
                            segment.points.push(p3);
                            last = p3;
                            prevCp = p2;
                        }
                        break;
                    }
                case 'A':
                    {
                        const params = this.parseNumbers(args);
                        for (let i = 0; i < params.length; i += 7) {
                            const r = {
                                x: params[i],
                                y: params[i + 1],
                            };
                            const xrot = params[i + 2];
                            const large = params[i + 3];
                            const sweep = params[i + 4];
                            const p2 = { x: params[i + 5], y: params[i + 6] };
                            this.addArc(segment, last, r, xrot, large, sweep, p2, tolerance2);
                            last = p2;
                        }
                        break;
                    }
                case 'a':
                    {
                        const params = this.parseNumbers(args);
                        for (let i = 0; i < params.length; i += 7) {
                            const r = {
                                x: params[i],
                                y: params[i + 1],
                            };
                            const xrot = params[i + 2];
                            const large = params[i + 3];
                            const sweep = params[i + 4];
                            const p2 = { x: last.x + params[i + 5], y: last.y + params[i + 6] };
                            this.addArc(segment, last, r, xrot, large, sweep, p2, tolerance2);
                            last = p2;
                        }
                        break;
                    }
                default:
                    console.error('unhandled path operation: ', op);
            }
        }
        appendCurrentSegment();
        return segments;
    }


    private addArc(segment: Segment, p1: Point, r: Point, phi: number, largeArc: number, sweep: number, p2: Point, tolerance: number) {
        // Implemented based on the SVG implementation notes
        // plus some recursive sugar for incrementally refining the
        // arc resolution until the requested tolerance is met.
        // http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        const dx = 0.5 * (p1.x - p2.x);
        const dy = 0.5 * (p1.y - p2.y);
        const xx = cp * dx + sp * dy;
        const yy = -sp * dx + cp * dy;
        let r2 = (Math.pow(r.x * r.y, 2) - Math.pow(r.x * yy, 2) - Math.pow(r.y * xx, 2)) /
            (Math.pow(r.x * yy, 2) + Math.pow(r.y * xx, 2));
        if (r2 < 0) { r2 = 0; }
        let rr = Math.sqrt(r2);
        if (largeArc === sweep) { rr = -rr; }
        const ccx = rr * r.x * yy / r.y;
        const ccy = -rr * r.y * xx / r.x;
        const cx = cp * ccx - sp * ccy + 0.5 * (p1.x + p2.x);
        const cy = sp * ccx + cp * ccy + 0.5 * (p1.y + p2.y);

        function angle(u: [number, number], v: [number, number]) {
            const a = Math.acos((u[0] * v[0] + u[1] * v[1]) /
                Math.sqrt((Math.pow(u[0], 2) + Math.pow(u[1], 2)) *
                    (Math.pow(v[0], 2) + Math.pow(v[1], 2))));
            let sgn = -1;
            if (u[0] * v[1] > u[1] * v[0]) { sgn = 1; }
            return sgn * a;
        }

        const psi = angle([1, 0], [(xx - ccx) / r.x, (yy - ccy) / r.y]);
        let delta = angle([(xx - ccx) / r.x, (yy - ccy) / r.y], [(-xx - ccx) / r.x, (-yy - ccy) / r.y]);
        if (sweep && delta < 0) { delta += Math.PI * 2; }
        if (!sweep && delta > 0) { delta -= Math.PI * 2; }

        const getVertex = (pct: number): Point => {
            const theta = psi + delta * pct;
            const ct = Math.cos(theta);
            const st = Math.sin(theta);
            return { x: cp * r.x * ct - sp * r.y * st + cx, y: sp * r.x * ct + cp * r.y * st + cy };
        };

        // let the recursive fun begin
        //
        const recursiveArc = (t1: number, t2: number, c1: Point, c5: Point, level: number) => {
            if (level > 18) {
                // protect from deep recursion cases
                // max 2**18 = 262144 segments
                return;
            }
            const tRange = t2 - t1;
            const tHalf = t1 + 0.5 * tRange;
            const c2 = getVertex(t1 + 0.25 * tRange);
            const c3 = getVertex(tHalf);
            const c4 = getVertex(t1 + 0.75 * tRange);
            if (this.vertexDistanceSquared(c2, this.vertexMiddle(c1, c3)) > tolerance) {
                recursiveArc(t1, tHalf, c1, c3, level + 1);
            }
            segment.points.push(c3);
            if (this.vertexDistanceSquared(c4, this.vertexMiddle(c3, c5)) > tolerance) {
                recursiveArc(tHalf, t2, c3, c5, level + 1);
            }
        };

        const t1Init = 0.0;
        const t2Init = 1.0;
        const c1Init = getVertex(t1Init);
        const c5Init = getVertex(t2Init);
        segment.points.push(c1Init);
        recursiveArc(t1Init, t2Init, c1Init, c5Init, 0);
        segment.points.push(c5Init);
    }

    private vertexDistanceSquared(v1: Point, v2: Point): number {
        return Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2);
    }

    private vertexMiddle(v1: Point, v2: Point): Point {
        return { x: (v2.x + v1.x) / 2.0, y: (v2.y + v1.y) / 2.0 };
    }

    private parseNumbers(args: string): number[] {
        const numbers = [];
        let current = '';
        let currentPoints = 0;

        function addCurrent() {
            const parsed = parseFloat(current.trim());
            if (!isNaN(parsed)) {
                numbers.push(parsed);
            }
            currentPoints = 0;
            current = '';
        }

        for (let i = 0; i < args.length; i++) {
            const prev = i > 1 ? args[i - 1] : '';
            const char = args[i];

            if (char === '.') {
                currentPoints++;

                if (currentPoints === 2) {
                    addCurrent();
                    currentPoints = 1;
                }
            }

            if (char === '-' && prev !== 'e') {
                addCurrent();
            }

            if (char === ' ' || char === ',') {
                addCurrent();
                continue;
            }
            current += char;
        }

        addCurrent();

        return numbers;
    }

    private parsePoints(params: string): Point[] {
        const numbers = this.parseNumbers(params);
        const points: Point[] = [];
        for (let i = 0; i < numbers.length; i += 2) {
            points.push({
                x: numbers[i],
                y: numbers[i + 1],
            });
        }
        return points;
    }



    private addCubicBezier(segment: Segment, p1: Point, p2: Point, p3: Point, p4: Point, level: number, tolerance: number) {
        // for details see:
        // http://www.antigrain.com/research/adaptive_bezier/index.html
        // based on DeCasteljau Algorithm
        // The reason we use a subdivision algo over an incremental one
        // is we want to have control over the deviation to the curve.
        // This mean we subdivide more and have more curve points in
        // curvy areas and less in flatter areas of the curve.

        if (level > 18) {
            // protect from deep recursion cases
            // max 2**18 = 262144 segments
            return;
        }

        // Calculate all the mid-points of the line segments
        const x12 = (p1.x + p2.x) / 2.0;
        const y12 = (p1.y + p2.y) / 2.0;
        const x23 = (p2.x + p3.x) / 2.0;
        const y23 = (p2.y + p3.y) / 2.0;
        const x34 = (p3.x + p4.x) / 2.0;
        const y34 = (p3.y + p4.y) / 2.0;
        const x123 = (x12 + x23) / 2.0;
        const y123 = (y12 + y23) / 2.0;
        const x234 = (x23 + x34) / 2.0;
        const y234 = (y23 + y34) / 2.0;
        const x1234 = (x123 + x234) / 2.0;
        const y1234 = (y123 + y234) / 2.0;

        // Try to approximate the full cubic curve by a single straight line
        const dx = p4.x - p1.x;
        const dy = p4.y - p1.y;

        const d2 = Math.abs(((p2.x - p4.x) * dy - (p2.y - p4.y) * dx));
        const d3 = Math.abs(((p3.x - p4.x) * dy - (p3.y - p4.y) * dx));

        if (Math.pow(d2 + d3, 2) < 5.0 * tolerance * (dx * dx + dy * dy)) {
            // added factor of 5.0 to match circle resolution
            segment.points.push({ x: x1234, y: y1234 });
            return;
        }

        // Continue subdivision
        this.addCubicBezier(segment, p1, { x: x12, y: y12 }, { x: x123, y: y123 }, { x: x1234, y: y1234 }, level + 1, tolerance);
        this.addCubicBezier(segment, { x: x1234, y: y1234 }, { x: x234, y: y234 }, { x: x34, y: y34 }, p4, level + 1, tolerance);
    }

    private addQuadraticBezier(segment: Segment, p1: Point, p2: Point, p3: Point, level: number, tolerance: number) {
        if (level > 18) {
            // protect from deep recursion cases
            // max 2**18 = 262144 segments
            return;
        }

        // Calculate all the mid-points of the line segments
        const x12 = (p1.x + p2.x) / 2.0;
        const y12 = (p1.y + p2.y) / 2.0;
        const x23 = (p2.x + p3.x) / 2.0;
        const y23 = (p2.y + p3.y) / 2.0;
        const x123 = (x12 + x23) / 2.0;
        const y123 = (y12 + y23) / 2.0;

        const dx = p3.x - p1.x;
        const dy = p3.y - p1.y;
        const d = Math.abs(((p2.x - p3.x) * dy - (p2.y - p3.y) * dx));

        if (d * d <= 5.0 * tolerance * (dx * dx + dy * dy)) {
            // added factor of 5.0 to match circle resolution
            segment.points.push({ x: x123, y: y123 });
            return;
        }

        // Continue subdivision
        this.addQuadraticBezier(segment, p1, { x: x12, y: y12 }, { x: x123, y: y123 }, level + 1, tolerance);
        this.addQuadraticBezier(segment, { x: x123, y: y123 }, { x: x23, y: y23 }, p3, level + 1, tolerance);
    }
}
