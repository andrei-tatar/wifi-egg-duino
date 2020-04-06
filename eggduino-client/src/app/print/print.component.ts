import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ApiService, PrintFile } from '../shared/api.service';
import { map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Layer } from '../utils';
import { CodeConverter } from '../shared/code-convert';
import { ActivatedRoute } from '@angular/router';
import { collapse } from '../animations';

@Component({
  selector: 'app-print',
  templateUrl: './print.component.html',
  styleUrls: ['./print.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [collapse]
})
export class PrintComponent implements OnInit {
  private selectFileName: string;
  selected: PrintFile;

  files$ = this.apiService.files$.pipe(
    map(files => files.map(file => {
      const model: PrintFileModel = {
        ...file,
        layers$: this.loadLayers(file),
      };

      if (file.name === this.selectFileName) {
        this.selected = model;
        this.selectFileName = null;
        this.cdr.markForCheck();
      }

      return model;
    })),
  );

  constructor(
    private apiService: ApiService,
    private codeConverter: CodeConverter,
    private cdr: ChangeDetectorRef,
    route: ActivatedRoute,
  ) {
    this.selectFileName = route.snapshot.queryParams.select;
  }

  ngOnInit(): void {
  }

  async deleteFile(file: PrintFileModel) {
    await this.apiService.deleteFile(file.name).toPromise();
  }

  selectFile(file: PrintFileModel) {
    if (this.selected === file) {
      this.selected = null;
    } else {
      this.selected = file;
    }
  }

  async printSelectedFile() {
    await this.apiService.printFile(this.selected.name).toPromise();
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
