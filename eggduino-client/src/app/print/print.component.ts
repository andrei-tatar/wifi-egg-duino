import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ApiService, PrintFile } from '../shared/api.service';
import { map, shareReplay, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { Layer } from '../utils';
import { CodeConverter } from '../shared/code-convert';
import { ActivatedRoute, Router } from '@angular/router';
import { collapse } from '../animations';
import { WebSocketService } from '../shared/ws.service';

@Component({
  selector: 'app-print',
  templateUrl: './print.component.html',
  styleUrls: ['./print.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [collapse]
})
export class PrintComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject();

  selectedFileName: string;

  files$ = this.apiService.files$.pipe(
    map(files => files.map(file => {
      const model: PrintFileModel = {
        ...file,
        layers$: this.loadLayers(file),
      };
      return model;
    })),
  );

  isPrinting$ = this.ws.status$.pipe(
    map(s => s.status !== 'stopped'),
    distinctUntilChanged(),
  );

  constructor(
    private apiService: ApiService,
    private codeConverter: CodeConverter,
    private cdr: ChangeDetectorRef,
    private ws: WebSocketService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
  }

  ngOnInit() {
    this.route.queryParams
      .pipe(
        map(q => q.select),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(s => {
        this.selectedFileName = s;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  async deleteFile(file: PrintFileModel) {
    await this.apiService.deleteFile(file.name).toPromise();
  }

  selectFile(file: PrintFileModel) {
    this.router.navigate(['.'], {
      relativeTo: this.route,
      queryParams: {
        select: file.name,
      },
    });
  }

  async printFile(file: PrintFile) {
    await this.apiService.printFile(file.name).toPromise();
  }

  private loadLayers(file: PrintFile) {
    return this.apiService.loadFile(file.name).pipe(
      map(code => this.codeConverter.codeToLayers(code)),
      shareReplay(1), // cache in memory
    );
  }
}

interface PrintFileModel extends PrintFile {
  layers$: Observable<Layer[]>;
}
