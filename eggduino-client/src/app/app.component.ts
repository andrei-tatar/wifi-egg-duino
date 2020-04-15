import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor(
    matIconRegistry: MatIconRegistry,
    domSanitizer: DomSanitizer,
  ) {
    for (let i = 1; i <= 4; i++) {
      matIconRegistry.addSvgIcon(`wifi_${i}`, domSanitizer.bypassSecurityTrustResourceUrl(`/assets/w${i}.svg`));
      matIconRegistry.addSvgIcon(`wifi_${i}_lock`, domSanitizer.bypassSecurityTrustResourceUrl(`/assets/w${i}l.svg`));
    }
  }
}
