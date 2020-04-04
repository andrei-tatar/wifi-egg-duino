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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';

import { PreviewComponent } from './preview/preview.component';
import { ApiService } from './api.service';
import { CodeConverter } from './code-convert';
import { HttpClientModule } from '@angular/common/http';
import { PresentationService } from './presentation.service';

@NgModule({
  declarations: [
    PreviewComponent
  ],
  imports: [
    CommonModule, HttpClientModule, MatSnackBarModule,
    MatButtonModule, MatTabsModule, MatInputModule, MatToolbarModule, MatCardModule,
    MatCheckboxModule, MatSelectModule, MatSliderModule, MatListModule,
  ],
  exports: [
    CommonModule,
    PreviewComponent,
    MatButtonModule, MatTabsModule, MatInputModule, MatToolbarModule, MatCardModule,
    MatCheckboxModule, MatSelectModule, MatSliderModule, MatListModule,
  ],
})
export class SharedModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: [
        ApiService, CodeConverter,
        PresentationService,
      ],
    };
  }
}
