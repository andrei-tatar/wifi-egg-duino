import { Component, Input, OnDestroy, ElementRef, OnInit, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';

import {
  Scene, Mesh, WebGLRenderer, Texture, MathUtils, GridHelper,
  PerspectiveCamera, AmbientLight, DirectionalLight, MeshStandardMaterial, TextureLoader, Color
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'dat.gui';

import { STEPS_PER_REV, DEFAULT_LAYER_COLORS, Layer, allMatches, Point, HOME } from 'src/app/utils';
import ResizeObserver from 'resize-observer-polyfill';
import { createGui, createGeometry } from './options';

@Component({
  selector: 'app-preview',
  template: '',
  styles: [':host{display:block;height: 360px;position:relative;}'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewComponent implements AfterViewInit, OnDestroy {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private animationTimer: number;
  private layersInternal: Layer[];
  private lineNumberInternal: number | undefined;
  private resizeObserver: ResizeObserver;
  private three: {
    camera: PerspectiveCamera;
    scene: Scene;
    renderer: WebGLRenderer;
    controls: OrbitControls;
    mesh: Mesh;
    gui: GUI;
  };

  @Input()
  set layers(value: Layer[]) {
    this.layersInternal = value;
    if (this.ctx) {
      this.redraw();
    }
  }

  @Input()
  set lineNumber(value: number | undefined) {
    this.lineNumberInternal = value;
    if (this.ctx) {
      this.redraw();
    }
  }

  @Input()
  showTravel = false;

  constructor(
    private element: ElementRef,
  ) {
  }

  ngAfterViewInit() {
    const mesh = this.createMesh();
    const camera = new PerspectiveCamera(40, 1, 0.01, 10);
    camera.position.x = -3;
    camera.position.y = 1;
    camera.position.z = 3.8;

    const scene = new Scene();
    scene.background = new Color(0xcce0ff);
    scene.add(mesh);

    const grid = new GridHelper(2, 10, 0, 0);
    (grid.material as any).opacity = 0.1;
    (grid.material as any).depthWrite = false;
    (grid.material as any).transparent = true;
    grid.translateY(-1);
    scene.add(grid);

    scene.add(new AmbientLight(0xdddddd));

    const light = new DirectionalLight(0xdfebff, 1);
    light.position.set(5, 16, 10);
    scene.add(light);

    const renderer = new WebGLRenderer({ antialias: true });

    this.element.nativeElement.appendChild(renderer.domElement);
    renderer.domElement.style.outline = 'none';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = MathUtils.degToRad(150);
    controls.minPolarAngle = MathUtils.degToRad(30);
    controls.minDistance = 1.5;
    controls.maxDistance = 3.5;
    controls.rotateSpeed = .3;
    controls.enablePan = false;

    const gui = createGui(mesh, this.ctx, () => this.redraw());
    this.element.nativeElement.appendChild(gui.domElement);

    this.three = { camera, scene, renderer, mesh, controls, gui };
    this.redraw();
    this.animate();

    this.resizeObserver = new ResizeObserver(([{ contentRect: { width, height } }]) => this.onResize(width, height));
    this.resizeObserver.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    this.stopAnimation();
    this.resizeObserver?.disconnect();
    setTimeout(() => {
      this.three.controls.dispose();
      this.three.renderer.dispose();
      this.three.scene.dispose();
      this.three.gui.destroy();
    }, 300);
  }

  private createMesh() {
    this.canvas = document.createElement('canvas');
    // must be power of 2
    this.canvas.width = 4096;
    this.canvas.height = 4096;

    this.ctx = this.canvas.getContext('2d');
    this.ctx.strokeStyle = 'darkred';
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.translate(0, this.canvas.height / 2);
    this.ctx.scale(this.canvas.width / STEPS_PER_REV, this.canvas.height / STEPS_PER_REV * 2);
    this.clearDrawing();

    const texture = new Texture(this.canvas);
    texture.needsUpdate = true;

    const textureLoader = new TextureLoader();

    const material = new MeshStandardMaterial({
      map: texture,
      roughness: .6,
      metalness: .4,
      bumpMap: textureLoader.load('assets/egg_shell.png'),
      displacementMap: textureLoader.load('assets/egg_shell.png'),
    });

    const mesh = new Mesh(createGeometry(), material);
    mesh.rotateY(MathUtils.degToRad(180));
    return mesh;
  }

  private redraw() {
    this.clearDrawing();
    if (!this.layersInternal) { return; }

    let found = false;

    this.ctx.save();
    for (const layer of this.layersInternal) {
      this.ctx.strokeStyle = this.getLayerColor(layer);

      for (const segment of layer.segments) {
        this.ctx.beginPath();

        let moveTo = true;
        for (let i = 0; i < segment.points.length - 1; i++) {
          const from = segment.points[i];
          const to = segment.points[i + 1];
          if (!found && typeof this.lineNumberInternal === 'number' &&
            (from.srcLineNumber >= this.lineNumberInternal ||
              to.srcLineNumber >= this.lineNumberInternal)) {
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.globalAlpha = .1;
            found = true;
            moveTo = true;
          }

          this.drawLine(moveTo, from, to);
          moveTo = false;
        }

        this.ctx.save();
        this.ctx.resetTransform();
        this.ctx.stroke(); // prevent scaling the line width
        this.ctx.restore();
      }
    }

    if (this.showTravel) {
      this.ctx.save();
      this.ctx.lineWidth = this.ctx.lineWidth / 2;
      this.ctx.strokeStyle = 'lightgreen';

      let last = HOME;
      for (const layer of this.layersInternal) {
        for (const segment of layer.segments) {
          this.ctx.beginPath();
          this.drawLine(true, last, segment.points[0]);
          last = segment.points[segment.points.length - 1];

          this.ctx.save();
          this.ctx.resetTransform();
          this.ctx.stroke(); // prevent scaling the line width
          this.ctx.restore();
        }
      }

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private drawLine(moveTo: boolean, from: Point, to: Point) {
    if (moveTo) {
      this.ctx.moveTo(from.x, from.y);
    }
    this.ctx.lineTo(to.x, to.y);

    let goBack = false;
    if (from.x < 0 || to.x < 0) {
      goBack = true;
      this.ctx.moveTo(from.x + STEPS_PER_REV, from.y);
      this.ctx.lineTo(to.x + STEPS_PER_REV, to.y);
    }
    if (from.x >= STEPS_PER_REV || to.x >= STEPS_PER_REV) {
      goBack = true;
      this.ctx.moveTo(from.x - STEPS_PER_REV, from.y);
      this.ctx.lineTo(to.x - STEPS_PER_REV, to.y);
    }

    if (goBack) {
      this.ctx.moveTo(to.x, to.y);
    }
  }

  private isColor(color: string) {
    const s = new Option().style;
    s.color = color;
    return s.color === color;
  }

  private clearDrawing() {
    this.ctx.save();
    this.ctx.resetTransform();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    if (this.three?.mesh?.material) {
      (this.three.mesh.material as MeshStandardMaterial).map.needsUpdate = true;
    }
  }

  private animate() {
    this.animationTimer = requestAnimationFrame(() => this.animate());
    this.three.controls.update();
    this.three.renderer.render(this.three.scene, this.three.camera);
  }

  private stopAnimation() {
    cancelAnimationFrame(this.animationTimer);
  }

  private onResize(width: number, height: number) {
    this.three.camera.aspect = width / height;
    this.three.camera.updateProjectionMatrix();
    this.three.renderer.setSize(width, height);
  }

  private getLayerColor(layer: Layer) {
    if (layer.description) {
      let color = layer.description.toLowerCase();
      if (this.isColor(color)) {
        return color;
      }

      for (const [match] of allMatches(layer.description, /\w+/gi)) {
        color = match.toLowerCase();
        if (this.isColor(color)) {
          return color;
        }
      }
    }

    const hash = Math.abs(this.hashString(layer.id ?? ''));
    return DEFAULT_LAYER_COLORS[hash % DEFAULT_LAYER_COLORS.length];
  }

  // https://stackoverflow.com/a/7616484/3016654
  private hashString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      // tslint:disable: no-bitwise
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash >> 16 | hash & 0xFFFF;
  }
}
