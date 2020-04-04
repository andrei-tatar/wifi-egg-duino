import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';

import { PreviewComponent } from './preview/preview.component';
import { ApiService } from './api.service';
import { CodeConverter } from './code-convert';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    PreviewComponent
  ],
  imports: [
    CommonModule, HttpClientModule,
    MatButtonModule, MatTabsModule, MatInputModule, MatToolbarModule, MatCardModule,
    MatCheckboxModule, MatSelectModule, MatSliderModule,
  ],
  exports: [
    CommonModule,
    PreviewComponent,
    MatButtonModule, MatTabsModule, MatInputModule, MatToolbarModule, MatCardModule,
    MatCheckboxModule, MatSelectModule, MatSliderModule,
  ],
})
export class SharedModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: [
        ApiService, CodeConverter,
      ],
    };
  }
}
