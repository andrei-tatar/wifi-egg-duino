import { Component, ChangeDetectionStrategy } from '@angular/core';
import { first } from 'rxjs/operators';
import { Config, ApiService } from 'src/app/shared/api.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigComponent {
  readonly config$ = this.api.config$;

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
