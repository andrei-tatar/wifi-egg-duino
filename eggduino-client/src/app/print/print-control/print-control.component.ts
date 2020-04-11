import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ApiService } from 'src/app/shared/api.service';
import { WebSocketService } from 'src/app/shared/ws.service';
import { map, distinctUntilChanged, switchMap, takeUntil, retryWhen } from 'rxjs/operators';
import { CodeConverter } from 'src/app/shared/code-convert';
import { of, combineLatest, Subject, concat, defer, EMPTY, race } from 'rxjs';
import { Layer, Point, distanceBetweenPoints, HOME } from 'src/app/utils';
import { PresentationService, Cancel } from 'src/app/shared/presentation.service';

@Component({
  selector: 'app-print-control',
  templateUrl: './print-control.component.html',
  styleUrls: ['./print-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintControlComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject();

  layers$ = this.ws.status$.pipe(
    map(s => s.fileName),
    distinctUntilChanged(),
    switchMap(fileName => fileName
      ? this.apiService.loadFile(fileName).pipe(map(data => this.codeConvert.codeToLayers(data)))
      : of([] as Layer[])),
  );

  progress$ = this.ws.status$.pipe(
    map(s => s.progress),
    distinctUntilChanged()
  );

  progressPercent = 0;
  status: 'printing' | 'paused' | 'stopped';
  get primaryLabel() {
    return this.status === 'printing' ? 'Pause' : 'Continue';
  }

  constructor(
    private apiService: ApiService,
    private ws: WebSocketService,
    private codeConvert: CodeConverter,
    private cdr: ChangeDetectorRef,
    private presentationService: PresentationService,
  ) { }

  ngOnInit(): void {
    const layersTotalTravel$ = this.layers$.pipe(
      map(layers => ({ layers, totalTravel: this.getTravel(layers) }))
    );

    combineLatest([layersTotalTravel$, this.progress$]).pipe(
      map(([{ layers, totalTravel }, currentLine]) => {
        const currentTravel = this.getTravel(layers, currentLine);
        return Math.round(currentTravel / totalTravel * 1000) / 10;
      }),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(p => {
      this.progressPercent = p;
      this.cdr.markForCheck();
    });

    this.ws.status$.pipe(
      map(s => s.status),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(status => {
      this.status = status;
      this.cdr.markForCheck();
    });

    this.ws.status$.pipe(
      switchMap(s => s.status === 'paused' && s.waitingFor?.length > 0
        ? this.presentationService.showConfirmation({
          title: 'Switch pen',
          message: `Switch pen for layer '${s.waitingFor}' and press continue when done.\nOr press stop to stop the print.`,
          okMessage: 'Continue',
          noMessage: 'Stop',
          disableClose: true,
        })
        : EMPTY
      ),
      switchMap(_ => this.apiService.sendCommand('print-continue')),
      retryWhen(err$ => err$.pipe(
        switchMap(err => err === Cancel
          ? this.stopPrint(true)
          : this.presentationService.showInformation({
            title: 'Error',
            message: `Unexpected error\n${err.message}`
          })),
      )),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  async pauseContinuePrint() {
    await this.apiService.sendCommand(this.status === 'printing' ? 'print-pause' : 'print-continue').toPromise();
  }

  async stopPrint(skipConfirmation = false) {
    try {
      await concat(
        skipConfirmation
          ? EMPTY
          : this.presentationService
            .showConfirmation({
              title: 'Please confirm',
              message: 'Are you sure you want to stop the print?'
            }),
        race(
          this.apiService
            .sendCommand('print-stop'),
          this.presentationService.globalLoader,
        ),
        defer(() => {
          this.presentationService.showToast('Print stopped');
          return EMPTY;
        }),
      ).pipe(
        takeUntil(this.destroy$)
      ).toPromise();
    } catch {
      // user cancelled
    }
  }

  private getTravel(layers: Layer[], upToLine?: number) {
    let lastPoint: Point = HOME;
    let travel = 0;

    for (const layer of layers) {
      for (const segment of layer.segments) {
        for (const point of segment.points) {
          travel += distanceBetweenPoints(lastPoint, point);
          lastPoint = point;
          if (point.srcLineNumber >= upToLine) {
            return travel;
          }
        }
      }
    }
    return travel;
  }
}
