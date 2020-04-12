import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
import { PrintingGuard } from './shared/printing.guard';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    SharedModule.forRoot(),
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot([
      {
        path: 'print', loadChildren: () => import('./print/print.module').then(m => m.PrintModule)
      },
      {
        path: 'create', loadChildren: () => import('./create/create.module').then(m => m.CreateModule),
        canActivate: [PrintingGuard]
      },
      {
        path: 'setup', loadChildren: () => import('./setup/setup.module').then(m => m.SetupModule),
        canActivate: [PrintingGuard]
      },
      { path: '**', redirectTo: 'print' },
    ]),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
