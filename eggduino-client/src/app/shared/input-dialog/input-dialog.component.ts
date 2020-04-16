
import { Component, ChangeDetectionStrategy, Inject, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { filter, first } from 'rxjs/operators';

@Component({
  selector: 'app-input-dialog',
  templateUrl: './input-dialog.component.html',
  styles: ['.mat-dialog-content{white-space: pre-line;} .mat-dialog-actions{justify-content: flex-end}'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputDialogComponent {

  @ViewChild('input')
  input: ElementRef;

  constructor(
    public dialogRef: MatDialogRef<InputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public options: ConfirmOptions
  ) {
    dialogRef.keydownEvents().pipe(
      filter(k => k.code === 'Enter'),
      first(),
    ).subscribe(_ => dialogRef.close(this.input.nativeElement.value));
  }

  onCancelClick(): void {
    this.dialogRef.close();
  }
}

export interface ConfirmOptions {
  title: string;
  message: string;
  okMessage: string;
  cancelMessage: string;
  inputType: string;
  inputLabel: string;
}
