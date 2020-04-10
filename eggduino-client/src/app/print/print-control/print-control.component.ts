import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ApiService } from 'src/app/shared/api.service';
import { WebSocketService } from 'src/app/shared/ws.service';
import { map, first, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';
import { CodeConverter } from 'src/app/shared/code-convert';
import { of } from 'rxjs';

@Component({
  selector: 'app-print-control',
  templateUrl: './print-control.component.html',
  styleUrls: ['./print-control.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrintControlComponent implements OnInit {

  status$ = this.ws.status$.pipe(map(s => s.status));

  layers$ = this.ws.status$.pipe(
    map(s => s.fileName),
    distinctUntilChanged(),
    switchMap(fileName => fileName
      ? this.apiService.loadFile(fileName).pipe(map(data => this.codeConvert.codeToLayers(data)))
      : of([])),
  );

  progress$ = this.ws.status$.pipe(map(s => s.progress), distinctUntilChanged());

  constructor(
    private apiService: ApiService,
    private ws: WebSocketService,
    private codeConvert: CodeConverter,
  ) { }


  ngOnInit(): void {
  }

  async pauseContinuePrint() {
    const status = await this.status$.pipe(first()).toPromise();
    await this.apiService.sendCommand(status === 'printing' ? 'print-pause' : 'print-continue').toPromise();
  }

  async stopPrint() {
    await this.apiService.sendCommand('print-stop').toPromise();
  }
}
