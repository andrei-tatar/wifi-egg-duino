import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { collapse } from 'src/app/animations';

@Component({
  selector: 'app-expander',
  templateUrl: './expander.component.html',
  styleUrls: ['./expander.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [collapse],
})
export class ExpanderComponent {
  @Input()
  label: string;

  @Input()
  expanded: boolean;
}
