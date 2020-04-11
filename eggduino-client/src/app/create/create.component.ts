import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { SvgSegmenter, LayerResolveType } from './services/svg-segmenter';
import { combineLatest, Subject, concat, of, race } from 'rxjs';
import { debounceTime, switchMap, takeUntil, map, retryWhen, tap, distinctUntilChanged, first } from 'rxjs/operators';
import { Layer, clone, removeExtension, blobToText, blobToDataUrl, propsEqual, STEPS_PER_REV } from '../utils';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TransformsService } from './services/transforms';
import { CodeConverter as CodeConverter } from '../shared/code-convert';
import { ApiService } from '../shared/api.service';
import { PresentationService } from '../shared/presentation.service';
import { Router } from '@angular/router';
import { ImageTracer } from './services/image-tracer';

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateComponent implements OnInit, OnDestroy {
  private file$ = new Subject<File>();
  private destroy$ = new Subject();
  private updateLayer$ = new Subject<
    { type: 'visible', id: string, visible: boolean } |
    { type: 'description', id: string, description: string } |
    { type: 'move', from: number, to: number }
  >();

  layerResolverType$ = this.apiService.config$.pipe(map(c => c.layerResolveType), distinctUntilChanged());
  visibleLayers: LayerModel[];
  layers: LayerModel[];
  stats: any;

  @ViewChild('name') name: ElementRef;

  constructor(
    private svg: SvgSegmenter,
    private transforms: TransformsService,
    private codeConverter: CodeConverter,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private presentationService: PresentationService,
    private router: Router,
  ) {
  }

  async uploadedFiles(files: FileList) {
    const file = files[0];
    if (!file) { return; }

    this.file$.next(file);
  }

  ngOnInit() {
    const allLayers$ = combineLatest([
      this.file$,
      this.layerResolverType$.pipe(debounceTime(200))
    ]).pipe(
      switchMap(async ([file, resolveType]) => {
        let svgText: string;
        if (file.type === 'image/svg+xml') {
          svgText = await blobToText(file);
        } else {
          const dataUrl = await blobToDataUrl(file);
          svgText = await new Promise(resolve => {
            const tracer = new ImageTracer();
            tracer.imageToSVG(dataUrl, svgstr => resolve(svgstr), 'posterized3');
          });
        }

        const { layers, width, height } = this.svg.segment(svgText, resolveType);
        const scale = Math.min(STEPS_PER_REV / width, STEPS_PER_REV / 2 / height);
        this.transforms.scaleLayers(layers, scale, scale, -height * scale / 2, false);
        this.name.nativeElement.innerText = removeExtension(file.name);
        return layers;
      }),
      retryWhen(err$ => err$.pipe(tap(err => {
        this.presentationService.showToast(`Could not open file. ${err.message}`);
        console.error(err);
      }))),
    );

    const visibleLayers$ = allLayers$.pipe(switchMap(layers => {
      const models: LayerModel[] = layers.map(layer => ({
        ...layer,
        description: layer.id ?? '< No Name >',
        visible: true,
      }));

      this.layers = models;

      return concat(
        of(models),
        this.updateLayer$.pipe(
          map(update => {
            switch (update.type) {
              case 'visible':
                {
                  const index = models.findIndex(l => l.id === update.id);
                  if (index >= 0) {
                    models[index].visible = update.visible;
                  }
                }
                break;
              case 'description':
                {
                  const index = models.findIndex(l => l.id === update.id);
                  if (index >= 0) {
                    models[index].description = update.description;
                  }
                }
                break;
              case 'move':
                moveItemInArray(models, update.from, update.to);
                break;
            }
            this.layers = models.slice();

            return models.filter(l => l.visible);
          })
        ));
    }));

    combineLatest([
      visibleLayers$,
      this.apiService.config$.pipe(
        map(c => ({ ...c, layerResolveType: undefined })),
        distinctUntilChanged((a, b) => propsEqual(a, b)),
        debounceTime(200)
      )
    ]).pipe(
      map(([layers, {
        hScale, vScale, vOffset,
        simplifySegments, simplifyThreshold,
        optimizeTravel, reverseSegments,
        mergeSegments, minTravelDistance,
      }]) => {
        const transformed = clone(layers);

        this.transforms.scaleLayers(transformed, hScale, vScale, vOffset);

        if (optimizeTravel) {
          this.transforms.optimizeTravel(transformed, reverseSegments);
        }

        if (mergeSegments) {
          this.transforms.mergeConsecutiveSegments(transformed, minTravelDistance);
        }

        if (simplifySegments) {
          this.transforms.simplifySegments(transformed, simplifyThreshold);
        }

        const stats = this.transforms.getImprovements(layers, transformed);
        return { layers: transformed, stats };
      }),
      takeUntil(this.destroy$),
    )
      .subscribe(({ layers, stats }) => {
        this.visibleLayers = layers;
        this.stats = stats;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  moveLayer(event: CdkDragDrop<string[]>) {
    this.updateLayer$.next({
      type: 'move',
      from: event.previousIndex,
      to: event.currentIndex,
    });
  }

  updateLayerDescription(layer: LayerModel, description: string) {
    this.updateLayer$.next({
      type: 'description',
      id: layer.id,
      description,
    });
  }

  toggleVisibility(layer: LayerModel) {
    this.updateLayer$.next({
      type: 'visible',
      id: layer.id,
      visible: !layer.visible,
    });
  }

  trackLayer(_: number, layer: Layer) {
    return layer.id;
  }

  async save(redirect = true) {
    try {
      const code = this.codeConverter.layersToCode(this.visibleLayers);
      const name = this.name.nativeElement.innerText;

      await race(
        this.apiService.uploadFile(name, code),
        this.presentationService.globalLoader,
      ).toPromise();

      this.presentationService.showToast('Saved OK');

      if (redirect) {
        this.router.navigate(['print'], {
          queryParams: {
            select: name,
          }
        });
      }
    } catch (error) {
      this.presentationService
        .showInformation({ title: 'Error', message: `Error during save. Possible duplicate filename.\n${error.message}` })
        .toPromise();
      this.name.nativeElement.focus();
    }
  }

  async updateLayerResolveType(layerResolveType: LayerResolveType) {
    const config = await this.apiService.config$.pipe(first()).toPromise();
    this.apiService.updateConfig({
      ...config,
      layerResolveType,
    });
  }
}

interface LayerModel extends Layer {
  visible: boolean;
}
