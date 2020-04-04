import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
