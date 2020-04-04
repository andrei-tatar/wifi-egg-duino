import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { SvgSegmenter, LayerResolveType } from './services/svg-segmenter';
import { ReplaySubject, combineLatest, Subject, BehaviorSubject, concat, of } from 'rxjs';
import { debounceTime, switchMap, takeUntil, map } from 'rxjs/operators';
import { Layer, clone } from '../utils';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Config } from './config/config.component';
import { TransformsService } from './services/transforms';
import { CodeConverter as CodeConverter } from '../shared/code-convert';
import { ApiService } from '../shared/api.service';

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent implements OnInit, OnDestroy {
  private file$ = new ReplaySubject<File>(1);
  private destroy$ = new Subject();
  private layerResolverType$ = new BehaviorSubject<LayerResolveType>('none');
  private config$ = new ReplaySubject<Config>(1);
  private moveLayers$ = new Subject<{ from: number, to: number }>();
  private updateLayer$ = new Subject<
    { type: 'visible', id: string, visible: boolean } |
    { type: 'description', id: string, description: string }
  >();

  layers: LayerModel[];
  stats: any;

  get layerResolverType() { return this.layerResolverType$.value; }
  set layerResolverType(value) { this.layerResolverType$.next(value); }

  set config(value: Config) { this.config$.next(value); }

  @ViewChild('name') name: ElementRef;

  constructor(
    private svg: SvgSegmenter,
    private transforms: TransformsService,
    private codeConverter: CodeConverter,
    private apiService: ApiService,
  ) {
  }

  async uploadedFiles(files: FileList) {
    const file = files[0];
    if (!file) { return; }
    const parts = file.name.split('.');
    this.name.nativeElement.innerText = parts.slice(0, parts.length - 1).join('.');
    this.file$.next(file);
  }

  ngOnInit() {
    const layers$ = combineLatest([this.file$, this.layerResolverType$])
      .pipe(
        debounceTime(200),
        switchMap(([file, resolveType]) => this.svg.segment(file, resolveType)),
      );

    const layersUpdated$ = layers$.pipe(switchMap(layers => {
      const models: LayerModel[] = layers.map(layer => ({
        ...layer,
        description: layer.id ?? '< No Name >',
        visible: true,
      }));

      return concat(of(models), this.updateLayer$.pipe(
        map(update => {
          const index = models.findIndex(l => l.id === update.id);
          if (index >= 0) {
            switch (update.type) {
              case 'visible':
                models[index].visible = update.visible;
                break;
              case 'description':
                models[index].description = update.description;
                break;
            }
          }
          return models;
        })
      ));
    }));

    const layersOrdered$ = layersUpdated$.pipe(switchMap(layers => concat(of(layers), this.moveLayers$.pipe(
      map(move => {
        moveItemInArray(layers, move.from, move.to);
        return layers;
      })
    ))));
    combineLatest([layersOrdered$, this.config$])
      .pipe(
        debounceTime(200),
        map(([layers, {
          hScale, vScale, vOffset,
          simplifySegments, simplifyThreshold,
          optimizeTravel, reverseSegments,
        }]) => {
          const transformed = clone(layers);

          this.transforms.scaleLayers(transformed, hScale, vScale, vOffset);
          this.transforms.roundPoints(transformed);

          if (simplifySegments) {
            this.transforms.simplifySegments(transformed, simplifyThreshold);
          }
          if (optimizeTravel) {
            this.transforms.optimizeTravel(transformed, reverseSegments);
          }
          this.transforms.mergeConsecutiveSegments(transformed);

          const stats = this.transforms.getImprovements(layers, transformed);
          return { layers: transformed, stats };
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(({ layers, stats }) => {
        this.layers = layers;
        this.stats = stats;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  moveLayer(event: CdkDragDrop<string[]>) {
    // this is only to update the UI immediately
    moveItemInArray(this.layers, event.previousIndex, event.currentIndex);

    this.moveLayers$.next({
      from: event.previousIndex,
      to: event.currentIndex,
    });
  }

  updateLayerDescription(layer: LayerModel, description: string) {
    layer.description = description;
    this.updateLayer$.next({
      type: 'description',
      id: layer.id,
      description,
    });
  }

  toggleVisibility(layer: LayerModel) {
    layer.visible = !layer.visible;
    this.updateLayer$.next({
      type: 'visible',
      id: layer.id,
      visible: layer.visible,
    });
  }

  trackLayer(_: number, layer: Layer) {
    return layer.id;
  }

  async save() {
    const code = this.codeConverter.convertToGcode(this.layers);
    await this.apiService.uploadFile(this.name.nativeElement.innerText, code).toPromise();
  }
}

interface LayerModel extends Layer {
  visible: boolean;
}
