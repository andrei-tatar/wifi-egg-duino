import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { PrintComponent } from './print.component';
import { SharedModule } from '../shared/shared.module';
import { PrintControlComponent } from './print-control/print-control.component';

const routes: Routes = [
  { path: '', component: PrintComponent }
];

@NgModule({
  declarations: [PrintComponent, PrintControlComponent],
  imports: [
    SharedModule, MatProgressBarModule,
    RouterModule.forChild(routes),
  ]
})
export class PrintModule { }
