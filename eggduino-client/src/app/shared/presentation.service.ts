import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { publish, refCount } from 'rxjs/operators';
import { MatSpinner } from '@angular/material/progress-spinner';
import { InputDialogComponent } from './input-dialog/input-dialog.component';

export const Cancel = Symbol('cancel');

@Injectable()
export class PresentationService {

    globalLoader = new Observable<never>(_ => {
        const dialogRef = this.dialog.open(MatSpinner, {
            disableClose: true,
            panelClass: 'loader-overlay',
        });
        return () => dialogRef.close();
    }).pipe(
        publish<never>(),
        refCount(),
    );

    constructor(
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
    ) {
    }

    showToast(message: string, duration = 3000) {
        this.snackBar.open(message, undefined, {
            duration,
        });
    }

    showConfirmation({ title, message, okMessage = 'Yes', noMessage = 'No', disableClose }:
        { title: string, message: string, okMessage?: string, noMessage?: string, disableClose?: boolean }) {
        return new Observable<string>(observer => {
            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                maxWidth: '400px',
                disableClose,
                data: {
                    title,
                    message,
                    okMessage,
                    noMessage,
                }
            });

            return dialogRef.afterClosed()
                .subscribe(result => {
                    if (result) {
                        observer.next(result);
                        observer.complete();
                    } else {
                        observer.error(Cancel);
                    }
                })
                .add(() => dialogRef.close());
        });
    }

    showInformation({ title, message, okMessage = 'OK' }:
        { title: string, message: string, okMessage?: string }) {
        return new Observable(observer => {
            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                disableClose: true,
                maxWidth: '400px',
                data: {
                    title,
                    message,
                    okMessage,
                },
            });

            return dialogRef.afterClosed()
                .subscribe(result => {
                    if (result) {
                        observer.next(result);
                        observer.complete();
                    } else {
                        observer.error(Cancel);
                    }
                })
                .add(() => dialogRef.close());
        });
    }

    showInput({ title, message, inputLabel, okMessage = 'OK', cancelMessage = 'Cancel', inputType = 'text' }: {
        title: string, message: string, okMessage?: string, cancelMessage?: string, inputType?: string, inputLabel: string,
    }) {
        return new Observable<string>(observer => {
            const dialogRef = this.dialog.open(InputDialogComponent, {
                disableClose: true,
                maxWidth: '400px',
                data: {
                    title,
                    message,
                    okMessage,
                    cancelMessage,
                    inputType,
                    inputLabel,
                },
            });

            return dialogRef.afterClosed()
                .subscribe(result => {
                    if (result) {
                        observer.next(result);
                        observer.complete();
                    } else {
                        observer.error(Cancel);
                    }
                })
                .add(() => dialogRef.close());
        });
    }
}
