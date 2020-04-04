import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MatListModule } from '@angular/material/list';


import { PrintComponent } from './print.component';
import { SharedModule } from '../shared/shared.module';


const routes: Routes = [
  { path: '', component: PrintComponent }
];

@NgModule({
  declarations: [PrintComponent],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    MatListModule
  ]
})
export class PrintModule { }
