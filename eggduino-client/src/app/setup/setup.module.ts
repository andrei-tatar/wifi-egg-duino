import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SetupComponent } from './setup.component';
import { SharedModule } from '../shared/shared.module';


const routes: Routes = [
  { path: '', component: SetupComponent }
];

@NgModule({
  declarations: [SetupComponent],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class SetupModule { }
