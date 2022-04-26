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
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent implements OnInit {
  @Input() someData: Array<BackgroundCandidate>;

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
    console.log(`Im being called from the data-table: `, this.someData);
    this.loading = true;
    this.ref.detectChanges();
    if(this.someData) {
      this.httpService.getCandidateData(this.someData).then((result: any[]) =>{
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
      type: 'link',
      handlers: {
        click: this.openPlacement.bind(this)
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
        click: this.openPlacement.bind(this)
      }
    },
    {
      id: 'backgroundPackage',
      label: 'Background Check Package',
      enabled: true,
      type: 'text',
    },
    {
      id: 'backgroundCheckStatus',
      label: 'Background Check Status',
      enabled: true,
      type: 'text',
    }
  ];
  public sharedDisplayColumns = [
    'actions',
    'preview',
    'id',
    'name',
    'backgroundPackage',
    'backgroundCheckStatus'
  ];

  public sharedPaginationOptions: IDataTablePaginationOptions = {
    theme: 'basic-wide',
    pageSize: 5,
    pageSizeOptions: [5],
  };

  private logEvent (event: any) {
    console.log("this is the event object: ", event);
  }

  private openPlacement(event: { originalEvent: MouseEvent; row: simpleCandidate }): void {
    this.httpService.openPlacement(event.row.id);
  }

}
