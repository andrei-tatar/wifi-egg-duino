import { Component, ChangeDetectionStrategy } from '@angular/core';
import { collapse } from '../animations';
import { ApiService, MotionCommand, MotionParams } from '../shared/api.service';
import { PresentationService } from '../shared/presentation.service';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [collapse],
})
export class SetupComponent {

  selected: 'wifi' | 'motion' | null = null;

  motionParams$ = this.api.motionParams$;

  constructor(
    private api: ApiService,
    private presentationService: PresentationService,
  ) {
  }

  toggle(cateogry: SetupComponent['selected']) {
    if (this.selected === cateogry) {
      this.selected = null;
    } else {
      this.selected = cateogry;
    }
  }

  async sendCommand(cmd: MotionCommand) {
    await this.api.sendCommand(cmd).toPromise();
  }

  async updateMotionParams(params: MotionParams) {
    try {
      await this.api.updateMotionParams(params).toPromise();
      this.presentationService.showToast('Updated');
    } catch (err) {
      console.error(err);
      this.presentationService.showToast('Could not update! :(');
    }
  }
}
