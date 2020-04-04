import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class PresentationService {

    constructor(
        private snackBar: MatSnackBar,
    ) {
    }

    showToast(message: string, duration = 3000) {
        this.snackBar.open(message, undefined, {
            duration,
        });
    }
}
