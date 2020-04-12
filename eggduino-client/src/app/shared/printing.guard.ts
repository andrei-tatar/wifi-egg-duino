import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';
import { Observable, of, NEVER, concat } from 'rxjs';
import { map, distinctUntilChanged, switchMap, catchError, ignoreElements } from 'rxjs/operators';
import { WebSocketService } from './ws.service';
import { PresentationService } from './presentation.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class PrintingGuard implements CanActivate {

  private isPrinting$ = this.ws.status$.pipe(map(s => s.status !== 'stopped'), distinctUntilChanged());

  constructor(
    private ws: WebSocketService,
    private router: Router,
    private presentationService: PresentationService,
    private api: ApiService,
  ) {
  }

  canActivate()
    : Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.isPrinting$.pipe(
      switchMap(printing => {
        if (!printing) {
          return of(true);
        }

        return this.presentationService.showConfirmation({
          title: 'Info',
          message: 'You can\'t navigate to other screens while a print is in progress',
          okMessage: 'Goto Print',
          noMessage: 'Stop Print',
          disableClose: true,
        }).pipe(
          map(_ => this.router.parseUrl('/print')),
          catchError(_ => concat(
            this.api.sendCommand('print-stop').pipe(ignoreElements()),
            NEVER
          )),
        );
      })
    );
  }

}
