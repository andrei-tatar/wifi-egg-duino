import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { CreateComponent } from './create.component';
import { SharedModule } from '../shared/shared.module';
import { PathSegmenter } from './services/path-segmenter';
import { SvgSegmenter } from './services/svg-segmenter';
import { ConfigComponent } from './config/config.component';
import { TransformsService } from './services/transforms';
import { ExpanderComponent } from './expander/expander.component';

const routes: Routes = [
  { path: '', component: CreateComponent }
];

@NgModule({
  declarations: [CreateComponent, ConfigComponent, ExpanderComponent],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    DragDropModule,
  ],
  providers: [
    PathSegmenter,
    SvgSegmenter,
    TransformsService,
  ]
})
export class CreateModule { }
