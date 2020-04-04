import { Component, ChangeDetectionStrategy, OnDestroy, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { BehaviorSubject, Subject, combineLatest } from 'rxjs';
import { debounceTime, map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigComponent implements AfterViewInit, OnDestroy {
  private destroy$ = new Subject();
  private hScale$ = new BehaviorSubject(1);
  private vScale$ = new BehaviorSubject(1);
  private vOffset$ = new BehaviorSubject(0);
  private simplify$ = new BehaviorSubject(true);
  private simplifyThreshold$ = new BehaviorSubject(.6);
  private optimizeTravel$ = new BehaviorSubject(true);
  private reverseSegments$ = new BehaviorSubject(true);

  get hScale() { return this.hScale$.value; }
  set hScale(value) { this.hScale$.next(value); }

  get vScale() { return this.vScale$.value; }
  set vScale(value) { this.vScale$.next(value); }

  get vOffset() { return this.vOffset$.value; }
  set vOffset(value) { this.vOffset$.next(value); }

  get simplify() { return this.simplify$.value; }
  set simplify(value) { this.simplify$.next(value); }

  get simplifyThreshold() { return this.simplifyThreshold$.value; }
  set simplifyThreshold(value) { this.simplifyThreshold$.next(value); }

  get optimizeTravel() { return this.optimizeTravel$.value; }
  set optimizeTravel(value) { this.optimizeTravel$.next(value); }

  get reverseSegments() { return this.reverseSegments$.value; }
  set reverseSegments(value) { this.reverseSegments$.next(value); }

  @Output()
  config = new EventEmitter<Config>(true);

  ngAfterViewInit() {
    const scale$ = combineLatest([this.hScale$, this.vScale$, this.vOffset$]);
    const simplify$ = combineLatest([this.simplify$, this.simplifyThreshold$]);
    const optimize$ = combineLatest([this.optimizeTravel$, this.reverseSegments$]);
    combineLatest([
      scale$,
      simplify$,
      optimize$,
    ]).pipe(
      debounceTime(300),
      map(([
        [hScale, vScale, vOffset],
        [simplifySegments, simplifyThreshold],
        [optimizeTravel, reverseSegments],
      ]) => ({
        hScale, vScale, vOffset,
        simplifySegments, optimizeTravel,
        simplifyThreshold, reverseSegments,
      })),
      takeUntil(this.destroy$)
    ).subscribe(config => this.config.next(config));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

export interface Config {
  hScale: number;
  vScale: number;
  vOffset: number;
  simplifySegments: boolean;
  optimizeTravel: boolean;
  reverseSegments: boolean;
  simplifyThreshold: number;
}
