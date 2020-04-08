import { GUI } from 'dat.gui';
import { MeshStandardMaterial, LatheBufferGeometry, Vector2, SphereGeometry, Mesh } from 'three';

const DEFAULT_OPTIONS: PreviewOptions = {
    geometry: 'egg',
    color: '#CB8D66',
    bump: true,
    penSize: 8,
};

const options = loadOptions();

export function createGeometry() {
    switch (options.geometry) {
        default:
        case 'egg':
            const points = [];
            for (let deg = 0; deg <= 180; deg += 6) {
                const rad = Math.PI * deg / 180;
                const point = new Vector2((0.72 + .08 * Math.cos(rad)) * Math.sin(rad), - Math.cos(rad));
                points.push(point);
            }
            return new LatheBufferGeometry(points, 64);
        case 'sphere':
            return new SphereGeometry(.8, 64, 64);
    }
}

export function createGui(mesh: Mesh, ctx: CanvasRenderingContext2D, redraw: () => void) {
    GUI.TEXT_OPEN = GUI.TEXT_CLOSED = 'Preview';
    const gui = new GUI({ autoPlace: false, width: 150 });

    const updateFillStyle = () => {
        ctx.fillStyle = options.color;
        redraw();
    };
    const updateBump = () => {
        const material = mesh.material as MeshStandardMaterial;
        updateMaterialBump(material);
    };
    const updatePenSize = () => {
        ctx.lineWidth = options.penSize;
        redraw();
    };

    gui.add(options, 'geometry').options(['egg', 'sphere']).onChange(_ => {
        saveOptions();
        mesh.geometry.dispose();
        mesh.geometry = createGeometry();
    });
    gui.addColor(options, 'color').onChange(_ => {
        saveOptions();
        updateFillStyle();
    });
    gui.add(options, 'bump').onChange(_ => {
        saveOptions();
        updateBump();
    });
    gui.add(options, 'penSize', 1, 48, 1).onChange(_ => {
        saveOptions();
        updatePenSize();
    });

    gui.close();

    updateFillStyle();
    updateBump();
    updatePenSize();
    return gui;
}

function updateMaterialBump(material: MeshStandardMaterial) {
    material.bumpScale = options.bump ? .005 : 0;
    material.displacementScale = options.bump ? .01 : 0;
    material.needsUpdate = true;
}

export interface PreviewOptions {
    geometry: 'egg' | 'sphere';
    color: string;
    bump: boolean;
    penSize: number;
}

function loadOptions(): PreviewOptions {
    const loaded = JSON.parse(localStorage.getItem('preview')) ?? DEFAULT_OPTIONS;
    return { ...DEFAULT_OPTIONS, ...loaded };
}

function saveOptions() {
    localStorage.setItem('preview', JSON.stringify(options));
}
