import { Component, OnInit, ChangeDetectorRef, Input, ChangeDetectionStrategy } from '@angular/core';
// vendor
import {
  IDataTablePreferences,
  IDataTableColumn,
  StaticDataTableService,
  NovoModalService,
  IDataTableService,
  IDataTablePaginationOptions,
  IDataTableSearchOptions,
} from 'novo-elements';
// App
import { AppBridgeService, HttpService } from '../services';
import { Util } from '../util/util';
import { BullhornMeta, JobOrderResponse, BackgroundCandidate, simpleCandidate } from '../interfaces/bullhorn';
import { isThisQuarter } from 'date-fns';

@Component({
  selector: 'app-onb-check-table',
  templateUrl: './onb-check-table.component.html',
  styleUrls: ['./onb-check-table.component.scss']
})
export class OnbCheckTableComponent implements OnInit {
  @Input() someDataOnb: Array<BackgroundCandidate>;

  public basicService: IDataTableService<simpleCandidate>;

  public candidateObj: {}
  loading: boolean = true;
  foundResults = false

  constructor(private ref: ChangeDetectorRef,
              private httpService: HttpService) {
   }

  ngOnInit() {
    
  }

  ngOnChanges(): void {
    console.log(`Im being called from the data-table: `, this.someDataOnb);
    this.loading = true;
    this.ref.detectChanges();
    if(this.someDataOnb) {
      this.httpService.getCandidateDataOnb(this.someDataOnb).then((result: any[]) =>{
        if(result.length > 0) {
          console.log(`Result: `, result);
          this.foundResults = true;
        }
        this.basicService = new StaticDataTableService(result)
        console.log(`Basic Service: `, this.basicService);
        this.loading = false;
        this.ref.detectChanges();
      })
    }
  }

  public sharedColumns: IDataTableColumn<simpleCandidate>[] = [
    {
      id: 'actions',
      type: 'action',
      label: 'Actions',
      enabled: true,
      action: {
        options: [
          { label: 'Go To Record', handlers: { click: this.logEvent.bind(this) } }
        ],
      },
    },
    {
      id: 'preview',
      type: 'action',
      enabled: true,
      handlers: {
        click: this.logEvent.bind(this),
      },
      action: {
        icon: 'preview',
      },
    },
    {
      id: 'id',
      label: 'id',
      sortable: true,
      type: 'link',
      handlers: {
        click: this.openCandidate.bind(this)
      }
    },
    {
      id: 'name',
      label: 'Name',
      enabled: true,
      sortable: true,
      filterable: false,
      type: 'link',
      handlers: {
        click: this.openCandidate.bind(this)
      }
    },
    {
      id: 'onboardingSent',
      label: 'Onboarding Docs Sent',
      enabled: true,
      type: 'number',
    },
    {
      id: 'onboardingReceived',
      label: 'Onboarding Received',
      enabled: true,
      type: 'number',
    },
    {
      id: 'onboardingComplete',
      label: 'Onboarding Complete %',
      enabled: true,
      type: 'number',
    }
  ];
  public sharedDisplayColumns = [
    'actions',
    'preview',
    'id',
    'name',
    'onboardingSent',
    'onboardingReceived',
    'onboardingComplete'
  ];

  public sharedPaginationOptions: IDataTablePaginationOptions = {
    theme: 'basic-wide',
    pageSize: 5,
    pageSizeOptions: [5],
  };

  private logEvent (event: any) {
    console.log("this is the event object: ", event);
  }

  private openCandidate(event: { originalEvent: MouseEvent; row: simpleCandidate }): void {
    this.httpService.openCandidate(event.row.id);
  }

}