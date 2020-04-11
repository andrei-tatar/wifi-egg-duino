import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';

@Injectable()
export class PresentationService {

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

    showConfirmation(title: string, message: string, okMessage = 'Yes', noMessage = 'No') {
        return new Observable(observer => {
            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                width: '250px',
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
                        observer.error(new Error('canceled'));
                    }
                })
                .add(() => dialogRef.close());
        });
    }
}
