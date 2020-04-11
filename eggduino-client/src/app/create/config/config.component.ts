import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { first } from 'rxjs/operators';
import { Config, ApiService } from 'src/app/shared/api.service';
import { collapse } from 'src/app/animations';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [collapse],
})
export class ConfigComponent {
  readonly config$ = this.api.config$;

  @Input()
  stats: any;

  constructor(
    private api: ApiService,
  ) {
  }

  async update<K extends keyof Config, V = Config[K]>(key: K, value: V) {
    const config = await this.config$.pipe(first()).toPromise();
    const updated = {
      ...config,
      [key]: value,
    };
    this.api.updateConfig(updated);
  }
}
