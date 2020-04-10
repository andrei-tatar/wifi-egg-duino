import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PrintComponent } from './print.component';
import { SharedModule } from '../shared/shared.module';
import { PrintControlComponent } from './print-control/print-control.component';

const routes: Routes = [
  { path: '', component: PrintComponent }
];

@NgModule({
  declarations: [PrintComponent, PrintControlComponent],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
  ]
})
export class PrintModule { }
