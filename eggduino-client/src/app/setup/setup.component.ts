import { Component, ChangeDetectionStrategy } from '@angular/core';
import { collapse } from '../animations';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [collapse],
})
export class SetupComponent {

  selected: 'wifi' | 'motors' | null = null;

  toggle(cateogry: SetupComponent['selected']) {
    if (this.selected === cateogry) {
      this.selected = null;
    } else {
      this.selected = cateogry;
    }
  }
}
