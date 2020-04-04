import { Component, OnInit } from '@angular/core';
import { ApiService } from '../shared/api.service';

@Component({
  selector: 'app-print',
  templateUrl: './print.component.html',
  styleUrls: ['./print.component.scss']
})
export class PrintComponent implements OnInit {

  files$ = this.apiService.getFiles();

  constructor(private apiService: ApiService) {
  }

  ngOnInit(): void {
  }

}
