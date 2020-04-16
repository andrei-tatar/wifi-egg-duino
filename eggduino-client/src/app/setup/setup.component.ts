import { Component, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { ApiService, MotionCommand, MotionParams, EncryptionType, Network } from '../shared/api.service';
import { PresentationService, Cancel } from '../shared/presentation.service';
import { combineLatest, race, Subject, of } from 'rxjs';
import { map, switchMap, catchError, retryWhen, takeWhile, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupComponent implements OnDestroy {
  private destroy$ = new Subject();

  selected: 'wifi' | 'motion' | null = null;

  refreshNetworks$ = new Subject();
  refreshMotion$ = new Subject();

  motionParams$ = this.refreshMotion$.pipe(
    switchMap(_ => this.api.motionParams$)
  );

  networks$ = this.refreshNetworks$.pipe(
    switchMap(_ => race(
      this.presentationService.globalLoader,
      combineLatest([
        this.api.wifiScan(),
        this.api.wifiStatus(),
      ])
    )),
    map(([networks, status]) => {
      networks.sort((a, b) => b.rssi - a.rssi);

      const models = networks.map(n => ({
        ...n,
        current: false,
        status: '',
        icon: `wifi_${this.getSignalBars(n.rssi)}${n.encryptionType !== EncryptionType.Open ? '_lock' : ''}`
      }));

      if (status.ssid) {
        const network = models.find(n => n.bssid === status.bssid);
        if (network) {
          network.current = true;
          network.status = this.prettyStatus(status.status);
        }
      }

      return models;
    }),
  );

  constructor(
    private api: ApiService,
    private presentationService: PresentationService,
  ) {
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  async connectToNetwork(network: Network) {
    const password$ = network.encryptionType === EncryptionType.Open
      ? of(undefined)
      : this.presentationService.showInput({
        title: 'Security',
        message: 'The selected Wi-Fi network requires a password',
        inputLabel: 'Password',
        inputType: 'password',
      });
    try {
      await password$.pipe(
        switchMap(pass => this.api.wifiConnect({
          ssid: network.ssid,
          bssid: network.bssid,
          password: pass,
        })),
        takeUntil(this.destroy$),
      ).toPromise();
    } catch (err) {
      if (err !== Cancel) {
        await this.presentationService
          .showInformation({
            title: 'Error',
            message: `Could not connect to WiFi\n${err.message}`,
          })
          .toPromise();
      }
    }
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

  private prettyStatus(status: string) {
    return status.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  private getSignalBars(rssi: number) {
    if (rssi > -55) { return 4; }
    if (rssi > -66) { return 3; }
    if (rssi > -77) { return 2; }
    return 1;
  }
}
