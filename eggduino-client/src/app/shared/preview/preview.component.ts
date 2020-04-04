import { Component, Input, OnDestroy, ElementRef, OnInit } from '@angular/core';

import {
  Scene, Vector2, LatheBufferGeometry, Mesh, WebGLRenderer, Texture, MathUtils, GridHelper,
  PerspectiveCamera, AmbientLight, DirectionalLight, MeshStandardMaterial, TextureLoader, Color
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { WIDTH, HEIGHT, DEFAULT_LAYER_COLORS, Layer, allMatches } from 'src/app/utils';
import ResizeObserver from 'resize-observer-polyfill';

@Component({
  selector: 'app-preview',
  template: '',
  styles: [':host{display:block;height: 360px;}']
})
export class PreviewComponent implements OnInit, OnDestroy {
  private readonly scaleCanvas = 1;
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private animationTimer: number;
  private layersInternal: Layer[];
  private three: {
    camera: PerspectiveCamera;
    scene: Scene;
    renderer: WebGLRenderer;
    controls: OrbitControls;
    mesh: Mesh;
  };

  @Input()
  get layers() { return this.layersInternal; }
  set layers(value) {
    this.layersInternal = value;
    if (this.ctx) {
      this.redraw();
    }
  }

  constructor(
    private element: ElementRef,
  ) {
    const observer = new ResizeObserver(([{ contentRect: { width, height } }]) => this.onResize(width, height));
    observer.observe(element.nativeElement);
  }

  ngOnInit(): void {
    const width = 500;
    const height = 500;

    const mesh = this.createEggMesh();
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
    renderer.setSize(width, height);

    this.element.nativeElement.appendChild(renderer.domElement);
    renderer.domElement.style.outline = 'none';

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = MathUtils.degToRad(150);
    controls.minPolarAngle = MathUtils.degToRad(30);
    controls.minDistance = 1.5;
    controls.maxDistance = 3.5;
    controls.rotateSpeed = .3;
    controls.enablePan = false;

    this.three = { camera, scene, renderer, mesh, controls };
    this.redraw();
    this.animate();
  }

  ngOnDestroy() {
    this.stopAnimation();
    this.three.controls.dispose();
    this.three.renderer.dispose();
    this.three.scene.dispose();
  }

  private createEggGeometry() {
    const points = [];
    for (let deg = 0; deg <= 180; deg += 6) {
      const rad = Math.PI * deg / 180;
      const point = new Vector2((0.72 + .08 * Math.cos(rad)) * Math.sin(rad), - Math.cos(rad));
      points.push(point);
    }
    return new LatheBufferGeometry(points, 60);
  }

  private createEggMesh() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH * this.scaleCanvas;
    this.canvas.height = HEIGHT * 2 * this.scaleCanvas;

    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = '#CB8D66';
    this.ctx.strokeStyle = 'darkred';
    this.ctx.lineWidth = 8;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.scale(this.scaleCanvas, this.scaleCanvas);
    this.ctx.translate(0, HEIGHT / 2);
    this.clearDrawing();

    const texture = new Texture(this.canvas);
    texture.needsUpdate = true;

    const textureLoader = new TextureLoader();

    const geometry = this.createEggGeometry();
    const material = new MeshStandardMaterial({
      map: texture,
      roughness: .6,
      metalness: .4,

      bumpMap: textureLoader.load('assets/egg_shell.png'),
      bumpScale: .005,

      displacementMap: textureLoader.load('assets/egg_shell.png'),
      displacementScale: .01,
    });

    const mesh = new Mesh(geometry, material);
    mesh.rotateY(MathUtils.degToRad(180));
    return mesh;
  }

  private redraw() {
    this.clearDrawing();
    if (!this.layersInternal) { return; }
    for (const layer of this.layersInternal) {
      this.ctx.strokeStyle = this.getLayerColor(layer);

      for (const segment of layer.segments) {
        this.ctx.beginPath();

        for (let i = 0; i < segment.points.length - 1; i++) {
          const from = segment.points[i];
          const to = segment.points[i + 1];
          if (i === 0) {
            this.ctx.moveTo(from.x, from.y);
          }
          this.ctx.lineTo(to.x, to.y);

          let goBack = false;
          if (from.x < 0 || to.x < 0) {
            goBack = true;
            this.ctx.moveTo(from.x + WIDTH, from.y);
            this.ctx.lineTo(to.x + WIDTH, to.y);
          }
          if (from.x >= WIDTH || to.x >= WIDTH) {
            goBack = true;
            this.ctx.moveTo(from.x - WIDTH, from.y);
            this.ctx.lineTo(to.x - WIDTH, to.y);
          }

          if (goBack) {
            this.ctx.moveTo(to.x, to.y);
          }
        }

        this.ctx.stroke();
      }
    }
  }

  private isColor(color: string) {
    const s = new Option().style;
    s.color = color;
    return s.color === color;
  }

  private clearDrawing() {
    this.ctx.fillRect(0, -HEIGHT / 2,
      this.canvas.width / this.scaleCanvas,
      this.canvas.height / this.scaleCanvas
    );
    if (this.three?.mesh?.material) {
      (this.three.mesh.material as any).map.needsUpdate = true;
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
      if (this.isColor(layer.description)) {
        return layer.description;
      }

      for (const [match] of allMatches(layer.description, /\w+/gi)) {
        if (this.isColor(match)) {
          return match;
        }
      }
    }

    const hash = Math.abs(this.hashString(layer.description ?? ''));
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
